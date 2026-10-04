/**
 * pi-rakit-subagent — delegate focused tasks to child agents.
 *
 * Registers a `subagent` tool the main agent can call, plus a `/subagent`
 * command for one-off runs. Each child runs in an in-memory session in the
 * current working directory.
 */

import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const AGENTS = Object.freeze({
	general: {
		label: "General",
		instructions:
			"You are a focused sub-agent. Complete the assigned task and reply with a concise, self-contained answer.",
	},
	reviewer: {
		label: "Reviewer",
		instructions:
			"You are a strict code reviewer. Find correctness bugs, edge cases, and missing tests. Cite file paths and be specific.",
	},
	scout: {
		label: "Scout",
		instructions:
			"You are a codebase scout. Investigate the repository and report relevant files, functions, and data flow. Do not modify files.",
	},
	planner: {
		label: "Planner",
		instructions:
			"You are a planning assistant. Produce a short, ordered plan with risks and open questions. Do not implement.",
	},
	tester: {
		label: "Tester",
		instructions:
			"You are a test author. Propose concrete test cases and edge cases for the described change.",
	},
});

const AGENT_IDS = Object.keys(AGENTS);

export function listAgents() {
	return AGENT_IDS.map((id) => ({
		id,
		label: AGENTS[id].label,
		instructions: AGENTS[id].instructions,
	}));
}

export function resolveAgent(name) {
	const id = String(name ?? "").trim().toLowerCase();
	if (id && AGENTS[id]) return { id, ...AGENTS[id] };
	return { id: "general", ...AGENTS.general };
}

export function buildPrompt(agent, task, context) {
	const sections = [agent.instructions, "", "# Task", String(task ?? "").trim()];
	const extra = String(context ?? "").trim();
	if (extra) sections.push("", "# Context", extra);
	return sections.join("\n");
}

export function parseCommand(input) {
	const tokens = String(input ?? "").trim().split(/\s+/).filter(Boolean);
	const first = tokens[0]?.toLowerCase();
	if (first && AGENTS[first] && tokens.length > 1) {
		return { agent: resolveAgent(first), task: tokens.slice(1).join(" ") };
	}
	return { agent: resolveAgent("general"), task: tokens.join(" ") };
}

const Parameters = Type.Object({
	agent: Type.Optional(
		Type.String({
			description: `Agent role to use (default "general"). One of: ${AGENT_IDS.join(", ")}.`,
		}),
	),
	task: Type.String({ description: "The focused task for the child agent." }),
	context: Type.Optional(
		Type.String({
			description: "Extra context such as files, diffs, or constraints.",
		}),
	),
});

async function runChild(cwd, agent, task, context, { signal, onUpdate } = {}) {
	const { session } = await createAgentSession({
		cwd,
		sessionManager: SessionManager.inMemory(),
	});
	let streamed = "";
	const unsubscribe = session.subscribe((event) => {
		if (
			event.type === "message_update" &&
			event.assistantMessageEvent?.type === "text_delta"
		) {
			streamed += event.assistantMessageEvent.delta;
			onUpdate?.({
				content: [{ type: "text", text: streamed }],
				details: { agent: agent.id },
			});
		}
	});
	const abort = () => {
		void session.abort();
	};
	signal?.addEventListener("abort", abort, { once: true });
	try {
		await session.prompt(buildPrompt(agent, task, context));
		const text = session.getLastAssistantText() ?? streamed;
		return { text: text || "(no output)", model: session.model?.id };
	} finally {
		signal?.removeEventListener("abort", abort);
		unsubscribe();
		session.dispose();
	}
}

export default function subagentExtension(pi) {
	pi.registerTool({
		name: "subagent",
		label: "Sub-agent",
		description:
			"Delegate a focused task to a child agent and return its answer. Use for code review, scouting, planning, or a second opinion.",
		promptSnippet: "Delegate a focused task to a child agent and return its answer.",
		parameters: Parameters,
		executionMode: "sequential",
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const agent = resolveAgent(params.agent);
			const result = await runChild(ctx.cwd, agent, params.task, params.context, {
				signal,
				onUpdate,
			});
			return {
				content: [{ type: "text", text: result.text }],
				details: { agent: agent.id, model: result.model },
			};
		},
	});

	pi.registerCommand("subagent", {
		description: "Run a one-off sub-agent task. Usage: /subagent [agent] <task>",
		async handler(args, ctx) {
			const { agent, task } = parseCommand(args);
			if (!task) {
				ctx.ui.notify(`Usage: /subagent [${AGENT_IDS.join("|")}] <task>`, "error");
				return;
			}
			ctx.ui.notify(`Sub-agent (${agent.id}) running…`, "info");
			try {
				const result = await runChild(ctx.cwd, agent, task);
				ctx.ui.notify(result.text, "info");
			} catch (error) {
				ctx.ui.notify(
					`Sub-agent failed: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			}
		},
	});
}
