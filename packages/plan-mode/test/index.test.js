import assert from "node:assert/strict";
import test from "node:test";
import planModeExtension from "../extensions/index.js";

function harness(options = {}) {
	const commands = new Map();
	const handlers = new Map();
	const entries = [];
	const toolChanges = [];
	const sent = [];
	let activeTools = options.activeTools ?? ["read", "bash", "edit", "write", "custom"];
	const pi = {
		registerFlag() {},
		registerCommand: (name, definition) => commands.set(name, definition),
		registerShortcut() {},
		on: (event, handler) => handlers.set(event, handler),
		getActiveTools: () => [...activeTools],
		setActiveTools: (tools) => {
			activeTools = [...tools];
			toolChanges.push([...tools]);
		},
		appendEntry: (customType, data) => entries.push({ type: "custom", customType, data }),
		getFlag: () => options.flag ?? false,
		sendMessage: (message, delivery) => sent.push({ message, delivery }),
		sendUserMessage: (message, delivery) => sent.push({ message, delivery }),
	};
	planModeExtension(pi);
	return { commands, handlers, entries, toolChanges, sent, getActiveTools: () => activeTools };
}

function context(options = {}) {
	const statuses = [];
	const widgets = [];
	const notices = [];
	return {
		hasUI: options.hasUI ?? true,
		sessionManager: { getEntries: () => options.entries ?? [] },
		ui: {
			setStatus: (key, value) => statuses.push({ key, value }),
			setWidget: (key, value) => widgets.push({ key, value }),
			notify: (message, level) => notices.push({ message, level }),
			select: async () => options.choice,
			editor: async () => options.refinement,
		},
		statuses,
		widgets,
		notices,
	};
}

const assistantPlan = {
	role: "assistant",
	content: [{ type: "text", text: "Plan:\n1. Inspect current behavior\n2. Add tests" }],
};

test("registers commands and toggles exact tool set", async () => {
	const app = harness();
	const ctx = context();
	assert.deepEqual([...app.commands.keys()], ["plan", "todos"]);

	await app.commands.get("plan").handler("", ctx);
	assert.deepEqual(app.getActiveTools(), ["read", "bash"]);
	assert.match(ctx.notices.at(-1).message, /enabled/);

	await app.commands.get("plan").handler("", ctx);
	assert.deepEqual(app.getActiveTools(), ["read", "bash", "edit", "write", "custom"]);
	assert.match(ctx.notices.at(-1).message, /restored/);
});

test("blocks non-plan tools and unsafe bash while enabled", async () => {
	const app = harness();
	const ctx = context();
	await app.commands.get("plan").handler("", ctx);

	const edit = await app.handlers.get("tool_call")({ toolName: "edit", input: {} });
	assert.equal(edit.block, true);
	assert.match(edit.reason, /edit/);
	const unsafe = await app.handlers.get("tool_call")({ toolName: "bash", input: { command: "git reset --hard" } });
	assert.equal(unsafe.block, true);
	assert.equal(await app.handlers.get("tool_call")({ toolName: "bash", input: { command: "git status" } }), undefined);
});

test("injects plan context then restores tools for execution", async () => {
	const app = harness();
	const toggleContext = context();
	await app.commands.get("plan").handler("", toggleContext);
	const injection = await app.handlers.get("before_agent_start")();
	assert.match(injection.message.content, /PLAN MODE ACTIVE/);

	const executionContext = context({ choice: "Execute plan" });
	await app.handlers.get("agent_end")({ messages: [assistantPlan] }, executionContext);
	assert.deepEqual(app.getActiveTools(), ["read", "bash", "edit", "write", "custom"]);
	assert.equal(app.sent.length, 1);
	assert.equal(app.sent[0].delivery.triggerTurn, true);
	assert.equal(app.entries.at(-1).data.executing, true);

	const executionPrompt = await app.handlers.get("before_agent_start")();
	assert.match(executionPrompt.message.content, /EXECUTING PLAN/);
	const filtered = await app.handlers.get("context")({
		messages: [
			{ role: "custom", customType: "plan-mode-context", content: "stale plan" },
			{ role: "custom", customType: "plan-execution-context", content: "stale execution" },
			{ role: "user", content: "execute" },
			{ role: "custom", ...executionPrompt.message },
		],
	});
	assert.deepEqual(
		filtered.messages.map((message) => message.customType ?? message.role),
		["user", "plan-execution-context"],
	);
});

test("tracks todo completion and clears completed execution", async () => {
	const persisted = {
		type: "custom",
		customType: "plan-mode-state",
		data: {
			enabled: false,
			executing: true,
			todos: [{ step: 1, text: "Test change", completed: false }],
		},
	};
	const app = harness();
	const ctx = context({ entries: [persisted] });
	await app.handlers.get("session_start")({}, ctx);
	await app.handlers.get("turn_end")({ message: { role: "assistant", content: [{ type: "text", text: "Done [DONE:1]" }] } }, ctx);
	assert.equal(app.entries.at(-1).data.todos[0].completed, true);
	await app.handlers.get("agent_end")({ messages: [] }, ctx);
	assert.equal(app.entries.at(-1).data.executing, false);
	assert.match(ctx.notices.at(-1).message, /complete/);
});

test("restores persisted or flag-enabled plan mode on session start", async () => {
	const app = harness({ flag: true });
	const ctx = context();
	await app.handlers.get("session_start")({}, ctx);
	assert.deepEqual(app.getActiveTools(), ["read", "bash"]);
	assert.equal(ctx.statuses.at(-1).value, "⏸ plan");
});

test("restores tools and clears UI on session shutdown", async () => {
	const app = harness({ flag: true });
	const ctx = context();
	await app.handlers.get("session_start")({}, ctx);
	await app.handlers.get("session_shutdown")({}, ctx);
	assert.deepEqual(app.getActiveTools(), ["read", "bash", "edit", "write", "custom"]);
	assert.deepEqual(ctx.statuses.at(-1), { key: "plan-mode", value: undefined });
	assert.deepEqual(ctx.widgets.at(-1), { key: "plan-mode-todos", value: undefined });
});
