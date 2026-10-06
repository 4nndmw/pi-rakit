/**
 * pi-rakit-subagent — delegate focused tasks to child agents.
 *
 * Features:
 *   - `subagent` tool: run a focused task (optionally in the background)
 *   - `subagents` tool: run several tasks in parallel
 *   - `subagent_jobs` / `subagent_result` tools + `/subagent-jobs` command
 *   - custom roles, per-role tool allowlists, and per-role models via config
 *
 * Config: ~/.pi/agent/subagent/agents.json (override with PI_RAKIT_SUBAGENT_CONFIG)
 *   {
 *     "defaultAgent": "general",
 *     "concurrency": 4,
 *     "agents": {
 *       "architect": { "label": "Architect", "instructions": "...", "tools": ["read","grep","find","ls"], "model": "provider/id" }
 *     }
 *   }
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { SubagentPanel } from "../panel.js";
import { Type } from "typebox";

const READ_ONLY_TOOLS = ["read", "grep", "find", "ls"];

export const BUILTIN_AGENTS = Object.freeze({
	general: {
		label: "General",
		instructions:
			"You are a focused sub-agent. Complete the assigned task and reply with a concise, self-contained answer.",
	},
	reviewer: {
		label: "Reviewer",
		instructions:
			"You are a strict code reviewer. Find correctness bugs, edge cases, and missing tests. Cite file paths and be specific.",
		tools: READ_ONLY_TOOLS,
	},
	scout: {
		label: "Scout",
		instructions:
			"You are a codebase scout. Investigate the repository and report relevant files, functions, and data flow. Do not modify files.",
		tools: READ_ONLY_TOOLS,
	},
	planner: {
		label: "Planner",
		instructions:
			"You are a planning assistant. Produce a short, ordered plan with risks and open questions. Do not implement.",
		tools: READ_ONLY_TOOLS,
	},
	tester: {
		label: "Tester",
		instructions:
			"You are a test author. Propose concrete test cases and edge cases for the described change.",
		tools: READ_ONLY_TOOLS,
	},
});

// ── config + agents ──────────────────────────────────────────────────

export function configPath() {
	return (
		process.env.PI_RAKIT_SUBAGENT_CONFIG ||
		join(homedir(), ".pi", "agent", "subagent", "agents.json")
	);
}

export function loadConfig(path = configPath()) {
	try {
		if (!existsSync(path)) return {};
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function normalizeAgent(id, def, base = {}) {
	return {
		id,
		label: def.label ?? base.label ?? id,
		instructions: def.instructions ?? base.instructions ?? "",
		tools: Array.isArray(def.tools) ? def.tools.map(String) : base.tools,
		model: typeof def.model === "string" ? def.model : base.model,
	};
}

export function mergeAgents(config = {}) {
	const merged = {};
	for (const [id, def] of Object.entries(BUILTIN_AGENTS)) {
		merged[id] = normalizeAgent(id, def);
	}
	const custom = config.agents && typeof config.agents === "object" ? config.agents : {};
	for (const [id, def] of Object.entries(custom)) {
		if (!def || typeof def !== "object") continue;
		merged[id] = normalizeAgent(id, def, merged[id]);
	}
	return merged;
}

export function listAgents(config = {}) {
	return Object.values(mergeAgents(config));
}

export function resolveAgent(name, config = {}) {
	const agents = mergeAgents(config);
	const id = String(name ?? "").trim().toLowerCase();
	if (id && agents[id]) return agents[id];
	return agents[config.defaultAgent] ?? agents.general;
}

export function buildPrompt(agent, task, context) {
	const sections = [agent.instructions, "", "# Task", String(task ?? "").trim()];
	const extra = String(context ?? "").trim();
	if (extra) sections.push("", "# Context", extra);
	return sections.join("\n");
}

export function parseCommand(input, config = {}) {
	const agents = mergeAgents(config);
	const tokens = String(input ?? "").trim().split(/\s+/).filter(Boolean);
	const first = tokens[0]?.toLowerCase();
	if (first && agents[first] && tokens.length > 1) {
		return { agent: agents[first], task: tokens.slice(1).join(" ") };
	}
	return { agent: agents[config.defaultAgent] ?? agents.general, task: tokens.join(" ") };
}

export function parseModelRef(ref) {
	const value = String(ref ?? "").trim();
	const slash = value.indexOf("/");
	if (slash <= 0 || slash === value.length - 1) return null;
	return { provider: value.slice(0, slash), id: value.slice(slash + 1) };
}

export function normalizeTasks(params, config = {}) {
	const raw = Array.isArray(params?.tasks) ? params.tasks : [];
	return raw
		.map((item) => ({
			agent: resolveAgent(item?.agent, config),
			task: String(item?.task ?? "").trim(),
			context: item?.context,
			model: typeof item?.model === "string" ? item.model : undefined,
			tools: Array.isArray(item?.tools) ? item.tools.map(String) : undefined,
		}))
		.filter((item) => item.task);
}

// ── concurrency + jobs ───────────────────────────────────────────────

export async function runWithConcurrency(items, limit, worker) {
	const results = new Array(items.length);
	const size = Math.max(1, Math.min(Math.floor(Number(limit) || 1), Math.max(1, items.length)));
	let cursor = 0;
	const runners = Array.from({ length: size }, async () => {
		while (true) {
			const current = cursor++;
			if (current >= items.length) return;
			results[current] = await worker(items[current], current);
		}
	});
	await Promise.all(runners);
	return results;
}

export class JobManager {
	constructor({ now = () => Date.now() } = {}) {
		this.jobs = new Map();
		this.sequence = 0;
		this.now = now;
	}

	create(agentId, task) {
		const id = `job-${++this.sequence}`;
		const job = {
			id,
			agent: agentId,
			task,
			status: "running",
			text: "",
			error: null,
			startedAt: this.now(),
			finishedAt: null,
		};
		this.jobs.set(id, job);
		return job;
	}

	finish(id, { text = "", error = null } = {}) {
		const job = this.jobs.get(id);
		if (!job) return job;
		job.status = error ? "failed" : "done";
		job.text = text ?? "";
		job.error = error ? String(error) : null;
		job.finishedAt = this.now();
		return job;
	}

	list() {
		return [...this.jobs.values()].sort((a, b) => b.startedAt - a.startedAt);
	}

	get(id) {
		return this.jobs.get(String(id ?? "").trim());
	}
}

// ── background delivery ──────────────────────────────────────────────

// "notify" (default): show a custom message. "followUp": inject as a user
// message so the model reacts. "off": do not deliver automatically.
export function resolveDeliveryMode(config = {}) {
	const mode = String(config.backgroundDelivery ?? "notify").trim().toLowerCase();
	if (mode === "off") return "off";
	if (mode === "followup" || mode === "follow-up" || mode === "user") return "followUp";
	return "notify";
}

export function formatJobDelivery(job) {
	const body = job.status === "failed" ? `Error: ${job.error}` : job.text || "(no output)";
	return `Sub-agent ${job.id} (${job.agent}) ${job.status}.\n\n${body}`;
}

function deliverJob(pi, job, config) {
	const mode = resolveDeliveryMode(config);
	if (mode === "off") return;
	const text = formatJobDelivery(job);
	try {
		if (mode === "followUp" && typeof pi.sendUserMessage === "function") {
			pi.sendUserMessage(text, { deliverAs: "followUp" });
			return;
		}
		if (typeof pi.sendMessage === "function") {
			pi.sendMessage(
				{
					customType: "subagent",
					content: text,
					display: true,
					details: { job: job.id, agent: job.agent, status: job.status },
				},
				{ triggerTurn: config.backgroundTriggerTurn === true, deliverAs: "followUp" },
			);
		}
	} catch {
		// Best-effort: the session may have been replaced since the job started.
	}
}

// ── child runtime ────────────────────────────────────────────────────

function resolveChildModel(modelRef, modelRegistry) {
	const ref = parseModelRef(modelRef);
	if (!ref || typeof modelRegistry?.find !== "function") return undefined;
	return modelRegistry.find(ref.provider, ref.id);
}

async function runChild({
	cwd,
	agent,
	task,
	context,
	model,
	tools,
	modelRegistry,
	signal,
	onUpdate,
}) {
	const sessionOptions = { cwd, sessionManager: SessionManager.inMemory() };
	const effectiveTools = tools ?? agent.tools;
	if (Array.isArray(effectiveTools) && effectiveTools.length > 0) {
		sessionOptions.tools = effectiveTools;
	}
	const resolvedModel = resolveChildModel(model ?? agent.model, modelRegistry);
	if (resolvedModel) sessionOptions.model = resolvedModel;

	const { session } = await createAgentSession(sessionOptions);
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

// ── rendering ────────────────────────────────────────────────────────

function resultText(result) {
	const block = result?.content?.find?.((item) => item?.type === "text");
	return block?.text ?? "";
}

function firstLine(text) {
	const line = String(text ?? "").split("\n").find((row) => row.trim()) ?? "";
	return line.length > 96 ? `${line.slice(0, 95)}…` : line;
}

export function truncateText(text, maxLines) {
	const lines = String(text ?? "").replace(/\s+$/, "").split("\n");
	if (!Number.isFinite(maxLines) || maxLines <= 0 || lines.length <= maxLines) {
		return { text: lines.join("\n"), hidden: 0 };
	}
	return { text: lines.slice(0, maxLines).join("\n"), hidden: lines.length - maxLines };
}

function preview(text, maxLines, theme) {
	const value = String(text ?? "").trim();
	if (!value) return theme.fg("dim", "\n  (no output)");
	const { text: body, hidden } = truncateText(value, maxLines);
	let out = `\n${theme.fg("text", body)}`;
	if (hidden > 0) {
		out += `\n${theme.fg("dim", `… ${hidden} more line${hidden === 1 ? "" : "s"} (ctrl+e to expand)`)}`;
	}
	return out;
}

function agentTitle(theme, agent, { done = false, background = false, model } = {}) {
	const icon = background
		? theme.fg("warning", "⏳ ")
		: done
			? theme.fg("success", "✓ ")
			: theme.fg("accent", "◆ ");
	let head = icon + theme.bold(theme.fg("toolTitle", String(agent ?? "general")));
	if (model) head += theme.fg("dim", ` · ${model}`);
	if (background) head += theme.fg("muted", " · background");
	return head;
}

// ── tool schemas ─────────────────────────────────────────────────────

const SubagentParameters = Type.Object({
	agent: Type.Optional(
		Type.String({ description: "Agent role (default: general). See config for custom roles." }),
	),
	task: Type.String({ description: "The focused task for the child agent." }),
	context: Type.Optional(
		Type.String({ description: "Extra context such as files, diffs, or constraints." }),
	),
	model: Type.Optional(
		Type.String({ description: 'Optional model override as "provider/model-id".' }),
	),
	tools: Type.Optional(
		Type.Array(Type.String(), { description: "Optional tool allowlist for the child." }),
	),
	background: Type.Optional(
		Type.Boolean({ description: "Run in the background and return a job id immediately." }),
	),
});

const SubagentsParameters = Type.Object({
	tasks: Type.Array(
		Type.Object({
			agent: Type.Optional(Type.String()),
			task: Type.String(),
			context: Type.Optional(Type.String()),
			model: Type.Optional(Type.String()),
		}),
		{ description: "Tasks to run in parallel." },
	),
	concurrency: Type.Optional(Type.Number({ description: "Max parallel children (default 4)." })),
});

const ResultParameters = Type.Object({
	id: Type.String({ description: "Background job id." }),
});

// ── extension ────────────────────────────────────────────────────────

function formatJob(job) {
	const when = new Date(job.startedAt).toLocaleTimeString();
	return `${job.id}  [${job.status}]  ${job.agent}  ${when}  ${job.task.slice(0, 60)}`;
}

export default function subagentExtension(pi) {
	const jobs = new JobManager();

	pi.registerTool({
		name: "subagent",
		label: "Sub-agent",
		description:
			"Delegate a focused task to a child agent and return its answer. Set background=true to run it without blocking.",
		promptSnippet: "Delegate a focused task to a child agent and return its answer.",
		parameters: SubagentParameters,
		executionMode: "sequential",
		renderShell: "self",
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const config = loadConfig();
			const agent = resolveAgent(params.agent, config);
			const cwd = ctx.cwd;
			const modelRegistry = ctx.modelRegistry;

			if (params.background) {
				const job = jobs.create(agent.id, params.task);
				void runChild({
					cwd,
					agent,
					task: params.task,
					context: params.context,
					model: params.model,
					tools: params.tools,
					modelRegistry,
				})
					.then((result) => deliverJob(pi, jobs.finish(job.id, { text: result.text }), config))
					.catch((error) => deliverJob(pi, jobs.finish(job.id, { error }), config));
				return {
					content: [
						{
							type: "text",
							text: `Started background sub-agent ${job.id} (${agent.id}). Fetch it with subagent_result or /subagent-jobs.`,
						},
					],
					details: { job: job.id, agent: agent.id, background: true },
				};
			}

			const result = await runChild({
				cwd,
				agent,
				task: params.task,
				context: params.context,
				model: params.model,
				tools: params.tools,
				modelRegistry,
				signal,
				onUpdate,
			});
			return {
				content: [{ type: "text", text: result.text }],
				details: { agent: agent.id, model: result.model },
			};
		},
		renderCall(args, theme) {
			const background = args?.background === true;
			const header = agentTitle(theme, args?.agent ?? "general", { background });
			const task = firstLine(args?.task);
			return new Text(`${header}${task ? `\n${theme.fg("dim", `  ${task}`)}` : ""}`, 0, 0);
		},
		renderResult(result, { expanded, isPartial }, theme, context) {
			const panel =
				context?.lastComponent instanceof SubagentPanel
					? context.lastComponent
					: new SubagentPanel(theme);
			panel.onTick = context?.invalidate;
			const details = result?.details ?? {};
			const agent = details.agent ?? context?.args?.agent ?? "general";
			const failed = context?.isError === true;
			const background = details.background === true;
			const { text: body, hidden } = truncateText(resultText(result), expanded ? 80 : 8);
			const status = failed ? "✗ " : background ? "⏳ " : isPartial ? "" : "✓ ";
			const model = details.model ? ` · ${details.model}` : "";
			panel.set({
				 theme,
				title: `${status}${agent}${model}${background ? " · background" : ""}`,
				body: body ? body.split("\n") : ["(no output)"],
				note:
					hidden > 0
						? `… ${hidden} more line${hidden === 1 ? "" : "s"} (ctrl+e to expand)`
						: "",
				tone: failed ? "error" : isPartial ? "accent" : background ? "warning" : "success",
				animate: isPartial,
			});
			return panel;
		},
	});

	pi.registerTool({
		name: "subagents",
		label: "Sub-agents (parallel)",
		description: "Run several child agents in parallel and return all answers.",
		promptSnippet: "Run several child agents in parallel and return all answers.",
		parameters: SubagentsParameters,
		executionMode: "sequential",
		renderShell: "self",
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const config = loadConfig();
			const tasks = normalizeTasks(params, config);
			if (tasks.length === 0) {
				return { content: [{ type: "text", text: "No tasks provided." }], details: {} };
			}
			const limit = Number(params.concurrency) || Number(config.concurrency) || 4;
			const results = await runWithConcurrency(tasks, limit, async (item, index) => {
				try {
					const result = await runChild({
						cwd: ctx.cwd,
						agent: item.agent,
						task: item.task,
						context: item.context,
						model: item.model,
						tools: item.tools,
						modelRegistry: ctx.modelRegistry,
						signal,
					});
					return { index, agent: item.agent.id, task: item.task, text: result.text };
				} catch (error) {
					return {
						index,
						agent: item.agent.id,
						task: item.task,
						text: `Error: ${error instanceof Error ? error.message : String(error)}`,
					};
				}
			});
			const text = results
				.map((result) => `## ${result.index + 1}. ${result.agent}\n${result.text}`)
				.join("\n\n");
			return { content: [{ type: "text", text }], details: { count: results.length } };
		},
		renderCall(args, theme) {
			const tasks = Array.isArray(args?.tasks) ? args.tasks : [];
			const header =
				theme.fg("accent", "◆ ") +
				theme.bold(theme.fg("toolTitle", "Sub-agents")) +
				theme.fg("muted", ` ×${tasks.length}`);
			const rows = tasks
				.slice(0, 6)
				.map((task) => theme.fg("dim", `  ${task.agent ?? "general"}: ${firstLine(task.task)}`));
			if (tasks.length > 6) rows.push(theme.fg("dim", `  … ${tasks.length - 6} more`));
			return new Text([header, ...rows].join("\n"), 0, 0);
		},
		renderResult(result, { expanded, isPartial }, theme, context) {
			const panel =
				context?.lastComponent instanceof SubagentPanel
					? context.lastComponent
					: new SubagentPanel(theme);
			panel.onTick = context?.invalidate;
			const count = result?.details?.count ?? 0;
			const failed = context?.isError === true;
			const { text: body, hidden } = truncateText(resultText(result), expanded ? 100 : 10);
			panel.set({
				 theme,
				title: `${failed ? "✗ " : isPartial ? "" : "✓ "}Sub-agents ×${count}`,
				body: body ? body.split("\n") : ["(no output)"],
				note:
					hidden > 0
						? `… ${hidden} more line${hidden === 1 ? "" : "s"} (ctrl+e to expand)`
						: "",
				tone: failed ? "error" : isPartial ? "accent" : "success",
				animate: isPartial,
			});
			return panel;
		},
	});

	pi.registerTool({
		name: "subagent_jobs",
		label: "Sub-agent jobs",
		description: "List background sub-agent jobs and their status.",
		parameters: Type.Object({}),
		executionMode: "sequential",
		async execute() {
			const list = jobs.list();
			const text = list.length
				? list.map(formatJob).join("\n")
				: "No background sub-agent jobs.";
			return { content: [{ type: "text", text }], details: { count: list.length } };
		},
		renderResult(result, { expanded }, theme) {
			const header =
				theme.fg("accent", "◆ ") + theme.bold(theme.fg("toolTitle", "Sub-agent jobs"));
			return new Text(header + preview(resultText(result), expanded ? 40 : 10, theme), 0, 0);
		},
	});

	pi.registerTool({
		name: "subagent_result",
		label: "Sub-agent result",
		description: "Return the output of a background sub-agent job by id.",
		parameters: ResultParameters,
		executionMode: "sequential",
		async execute(_toolCallId, params) {
			const job = jobs.get(params.id);
			if (!job) {
				return { content: [{ type: "text", text: `Unknown job "${params.id}".` }], details: {} };
			}
			if (job.status === "running") {
				return { content: [{ type: "text", text: `${job.id} is still running.` }], details: { id: job.id } };
			}
			const text = job.status === "failed" ? `Error: ${job.error}` : job.text;
			return { content: [{ type: "text", text }], details: { id: job.id, status: job.status } };
		},
		renderResult(result, { expanded }, theme) {
			const id = result?.details?.id ?? "";
			const header =
				theme.fg("accent", "◆ ") +
				theme.bold(theme.fg("toolTitle", id ? `Sub-agent ${id}` : "Sub-agent result"));
			return new Text(header + preview(resultText(result), expanded ? 60 : 10, theme), 0, 0);
		},
	});

	pi.registerCommand("subagent", {
		description: "Run a one-off sub-agent task. Usage: /subagent [agent] <task>",
		async handler(args, ctx) {
			const config = loadConfig();
			const { agent, task } = parseCommand(args, config);
			if (!task) {
				ctx.ui.notify("Usage: /subagent [agent] <task>", "error");
				return;
			}
			ctx.ui.notify(`Sub-agent (${agent.id}) running…`, "info");
			try {
				const result = await runChild({
					cwd: ctx.cwd,
					agent,
					task,
					modelRegistry: ctx.modelRegistry,
				});
				ctx.ui.notify(result.text, "info");
			} catch (error) {
				ctx.ui.notify(
					`Sub-agent failed: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			}
		},
	});

	pi.registerCommand("subagent-jobs", {
		description: "List background sub-agent jobs",
		handler(_args, ctx) {
			const list = jobs.list();
			ctx.ui.notify(
				list.length ? list.map(formatJob).join("\n") : "No background sub-agent jobs.",
				"info",
			);
		},
	});
}
