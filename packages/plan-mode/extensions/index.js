import { Key } from "@earendil-works/pi-tui";
import {
	extractTodoItems,
	isSafeCommand,
	markCompletedSteps,
} from "./utils.js";

const STATE_TYPE = "plan-mode-state";
const STATUS_KEY = "plan-mode";
const WIDGET_KEY = "plan-mode-todos";
const PLAN_TOOLS = new Set(["read", "bash", "grep", "find", "ls", "questionnaire"]);

function isAssistantMessage(message) {
	return message?.role === "assistant" && Array.isArray(message.content);
}

function textContent(message) {
	return message.content
		.filter((block) => block?.type === "text")
		.map((block) => block.text)
		.join("\n");
}

function latestState(entries) {
	return [...entries]
		.reverse()
		.find((entry) => entry.type === "custom" && entry.customType === STATE_TYPE)
		?.data;
}

export default function planModeExtension(pi) {
	let enabled = false;
	let executing = false;
	let todos = [];
	let toolsBeforePlanMode;

	pi.registerFlag("plan", {
		description: "Start in read-only plan mode",
		type: "boolean",
		default: false,
	});

	function persist() {
		pi.appendEntry(STATE_TYPE, { enabled, executing, todos });
	}

	function updateUi(ctx) {
		if (executing && todos.length > 0) {
			const complete = todos.filter((todo) => todo.completed).length;
			ctx.ui.setStatus(STATUS_KEY, `📋 ${complete}/${todos.length}`);
			ctx.ui.setWidget(
				WIDGET_KEY,
				todos.map((todo) => `${todo.completed ? "☑" : "☐"} ${todo.text}`),
			);
			return;
		}
		ctx.ui.setStatus(STATUS_KEY, enabled ? "⏸ plan" : undefined);
		ctx.ui.setWidget(WIDGET_KEY, undefined);
	}

	function enableTools() {
		if (toolsBeforePlanMode === undefined) toolsBeforePlanMode = pi.getActiveTools();
		pi.setActiveTools(toolsBeforePlanMode.filter((name) => PLAN_TOOLS.has(name)));
	}

	function restoreTools() {
		if (toolsBeforePlanMode !== undefined) pi.setActiveTools(toolsBeforePlanMode);
		toolsBeforePlanMode = undefined;
	}

	function setPlanMode(nextEnabled, ctx, { notify = true } = {}) {
		enabled = nextEnabled;
		executing = false;
		todos = [];
		if (enabled) enableTools();
		else restoreTools();
		updateUi(ctx);
		persist();
		if (notify) {
			ctx.ui.notify(
				enabled
					? "Plan mode enabled. Mutating tools and shell commands are blocked."
					: "Plan mode disabled. Previous tools restored.",
				"info",
			);
		}
	}

	function toggle(ctx) {
		setPlanMode(!enabled, ctx);
	}

	pi.registerCommand("plan", {
		description: "Toggle read-only planning mode",
		handler: async (_args, ctx) => toggle(ctx),
	});

	pi.registerCommand("todos", {
		description: "Show current plan progress",
		handler: async (_args, ctx) => {
			if (todos.length === 0) {
				ctx.ui.notify("No active plan todos.", "info");
				return;
			}
			ctx.ui.notify(
				todos
					.map((todo) => `${todo.step}. ${todo.completed ? "✓" : "○"} ${todo.text}`)
					.join("\n"),
				"info",
			);
		},
	});

	pi.registerShortcut(Key.ctrlAlt("p"), {
		description: "Toggle plan mode",
		handler: async (ctx) => toggle(ctx),
	});

	pi.on("tool_call", async (event) => {
		if (!enabled) return undefined;
		if (!PLAN_TOOLS.has(event.toolName)) {
			return {
				block: true,
				reason: `Plan mode: tool "${event.toolName}" is blocked. Run /plan to restore full access.`,
			};
		}
		if (event.toolName === "bash" && !isSafeCommand(event.input?.command)) {
			return {
				block: true,
				reason: "Plan mode: shell command is not on the read-only allowlist. Run /plan to restore full access.",
			};
		}
		return undefined;
	});

	pi.on("context", async (event) => {
		const activeType = enabled
			? "plan-mode-context"
			: executing
				? "plan-execution-context"
				: undefined;
		let keptActiveContext = false;
		const messages = [...event.messages].reverse().filter((message) => {
			if (
				message.customType !== "plan-mode-context" &&
				message.customType !== "plan-execution-context"
			) return true;
			if (message.customType !== activeType || keptActiveContext) return false;
			keptActiveContext = true;
			return true;
		}).reverse();
		return { messages };
	});

	pi.on("before_agent_start", async () => {
		if (enabled) {
			return {
				message: {
					customType: "plan-mode-context",
					content: `[PLAN MODE ACTIVE]\nRead-only exploration mode. Do not modify files, settings, dependencies, Git state, processes, or external resources. Use available read-only tools only. Ask concise clarifying questions when requirements are ambiguous. End with an actionable numbered plan under this exact header:\n\nPlan:\n1. First step\n2. Second step`,
					display: false,
				},
			};
		}
		if (executing && todos.length > 0) {
			const remaining = todos
				.filter((todo) => !todo.completed)
				.map((todo) => `${todo.step}. ${todo.text}`)
				.join("\n");
			return {
				message: {
					customType: "plan-execution-context",
					content: `[EXECUTING PLAN]\nComplete remaining steps in order. After each completed step include [DONE:n].\n\n${remaining}`,
					display: false,
				},
			};
		}
		return undefined;
	});

	pi.on("turn_end", async (event, ctx) => {
		if (!executing || !isAssistantMessage(event.message)) return;
		if (markCompletedSteps(textContent(event.message), todos) > 0) {
			updateUi(ctx);
			persist();
		}
	});

	pi.on("agent_end", async (event, ctx) => {
		if (executing) {
			if (todos.length > 0 && todos.every((todo) => todo.completed)) {
				executing = false;
				todos = [];
				updateUi(ctx);
				persist();
				ctx.ui.notify("Plan complete.", "info");
			}
			return;
		}
		if (!enabled || !ctx.hasUI) return;

		const lastAssistant = [...event.messages].reverse().find(isAssistantMessage);
		if (lastAssistant) todos = extractTodoItems(textContent(lastAssistant));
		if (todos.length === 0) return;
		persist();

		const choice = await ctx.ui.select("Plan ready", [
			"Execute plan",
			"Stay in plan mode",
			"Refine plan",
		]);
		if (choice === "Execute plan") {
			enabled = false;
			executing = true;
			restoreTools();
			updateUi(ctx);
			persist();
			pi.sendMessage(
				{
					customType: "plan-mode-execute",
					content: `Execute this plan in order:\n\n${todos.map((todo) => `${todo.step}. ${todo.text}`).join("\n")}\n\nMark completed steps with [DONE:n].`,
					display: true,
				},
				{ triggerTurn: true, deliverAs: "followUp" },
			);
		} else if (choice === "Refine plan") {
			const refinement = await ctx.ui.editor("How should the plan change?", "");
			if (refinement?.trim()) pi.sendUserMessage(refinement.trim(), { deliverAs: "followUp" });
		}
	});

	pi.on("session_start", async (_event, ctx) => {
		const state = latestState(ctx.sessionManager.getEntries());
		if (state) {
			enabled = state.enabled === true;
			executing = state.executing === true;
			todos = Array.isArray(state.todos) ? state.todos : [];
		}
		if (pi.getFlag("plan") === true) {
			enabled = true;
			executing = false;
			todos = [];
		}
		if (enabled) enableTools();
		updateUi(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		restoreTools();
		ctx.ui.setStatus(STATUS_KEY, undefined);
		ctx.ui.setWidget(WIDGET_KEY, undefined);
	});
}
