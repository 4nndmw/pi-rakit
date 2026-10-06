import assert from "node:assert/strict";
import test from "node:test";
import subagentExtension, {
	JobManager,
	buildPrompt,
	formatJobDelivery,
	listAgents,
	loadConfig,
	mergeAgents,
	normalizeTasks,
	parseCommand,
	parseModelRef,
	resolveAgent,
	resolveDeliveryMode,
	runWithConcurrency,
} from "../extensions/index.js";

test("lists the built-in agents", () => {
	assert.deepEqual(
		listAgents().map((agent) => agent.id),
		["general", "reviewer", "scout", "planner", "tester"],
	);
	assert.deepEqual(listAgents().find((agent) => agent.id === "scout").tools, [
		"read",
		"grep",
		"find",
		"ls",
	]);
});

test("resolves agents with a general fallback", () => {
	assert.equal(resolveAgent("reviewer").id, "reviewer");
	assert.equal(resolveAgent("REVIEWER").id, "reviewer");
	assert.equal(resolveAgent("unknown").id, "general");
	assert.equal(resolveAgent(undefined).id, "general");
});

test("merges custom roles from config", () => {
	const config = {
		defaultAgent: "architect",
		agents: {
			architect: {
				label: "Architect",
				instructions: "Design systems.",
				tools: ["read"],
				model: "openai/gpt-4o",
			},
		},
	};
	const agents = mergeAgents(config);
	assert.equal(agents.architect.label, "Architect");
	assert.deepEqual(agents.architect.tools, ["read"]);
	assert.equal(agents.architect.model, "openai/gpt-4o");
	assert.ok(agents.reviewer, "built-ins remain available");
	assert.equal(resolveAgent(undefined, config).id, "architect");

	const overridden = mergeAgents({ agents: { reviewer: { instructions: "Custom review." } } });
	assert.equal(overridden.reviewer.instructions, "Custom review.");
	assert.match(overridden.reviewer.label, /Reviewer/);
});

test("loadConfig returns an empty object for a missing file", () => {
	assert.deepEqual(loadConfig("/definitely/not/here/agents.json"), {});
});

test("builds a prompt with instructions, task, and optional context", () => {
	const prompt = buildPrompt(resolveAgent("reviewer"), "Review this diff", "diff --git a b");
	assert.match(prompt, /strict code reviewer/i);
	assert.match(prompt, /# Task\nReview this diff/);
	assert.match(prompt, /# Context\ndiff --git a b/);

	const withoutContext = buildPrompt(resolveAgent("general"), "Do it");
	assert.doesNotMatch(withoutContext, /# Context/);
});

test("parses /subagent commands with an optional agent prefix", () => {
	const withAgent = parseCommand("reviewer check the parser");
	assert.equal(withAgent.agent.id, "reviewer");
	assert.equal(withAgent.task, "check the parser");

	const withoutAgent = parseCommand("summarize the repo");
	assert.equal(withoutAgent.agent.id, "general");
	assert.equal(withoutAgent.task, "summarize the repo");

	const bare = parseCommand("reviewer");
	assert.equal(bare.agent.id, "general");
	assert.equal(bare.task, "reviewer");
});

test("parses model references", () => {
	assert.deepEqual(parseModelRef("openai/gpt-4o"), { provider: "openai", id: "gpt-4o" });
	assert.equal(parseModelRef("gpt-4o"), null);
	assert.equal(parseModelRef(""), null);
	assert.equal(parseModelRef(undefined), null);
});

test("normalizes parallel tasks", () => {
	const tasks = normalizeTasks({
		tasks: [
			{ agent: "reviewer", task: "check" },
			{ task: "" },
			{ agent: "scout", task: "find", model: "p/m" },
		],
	});
	assert.equal(tasks.length, 2);
	assert.equal(tasks[0].agent.id, "reviewer");
	assert.equal(tasks[1].task, "find");
	assert.equal(tasks[1].model, "p/m");
});

test("runs work with bounded concurrency preserving order", async () => {
	let active = 0;
	let peak = 0;
	const results = await runWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
		active++;
		peak = Math.max(peak, active);
		await new Promise((resolve) => setTimeout(resolve, 5));
		active--;
		return value * 2;
	});
	assert.deepEqual(results, [2, 4, 6, 8, 10]);
	assert.ok(peak <= 2, `peak concurrency was ${peak}`);
});

test("tracks background jobs", () => {
	let tick = 0;
	const manager = new JobManager({ now: () => ++tick });
	const job = manager.create("reviewer", "check");
	assert.equal(job.status, "running");
	manager.finish(job.id, { text: "ok" });
	const done = manager.get(job.id);
	assert.equal(done.status, "done");
	assert.equal(done.text, "ok");
	assert.equal(manager.list().length, 1);
});

test("resolves the background delivery mode", () => {
	assert.equal(resolveDeliveryMode({}), "notify");
	assert.equal(resolveDeliveryMode({ backgroundDelivery: "followUp" }), "followUp");
	assert.equal(resolveDeliveryMode({ backgroundDelivery: "user" }), "followUp");
	assert.equal(resolveDeliveryMode({ backgroundDelivery: "off" }), "off");
	assert.equal(resolveDeliveryMode({ backgroundDelivery: "nonsense" }), "notify");
});

test("formats a background job delivery", () => {
	const done = { id: "job-1", agent: "reviewer", status: "done", text: "Looks good", error: null };
	assert.match(formatJobDelivery(done), /job-1 \(reviewer\) done/);
	assert.match(formatJobDelivery(done), /Looks good/);

	const failed = { id: "job-2", agent: "scout", status: "failed", text: "", error: "boom" };
	assert.match(formatJobDelivery(failed), /Error: boom/);
});

test("registers the subagent tools and commands", () => {
	const tools = [];
	const commands = [];
	subagentExtension({
		registerTool: (tool) => tools.push(tool),
		registerCommand: (name, config) => commands.push({ name, config }),
	});
	assert.deepEqual(
		tools.map((tool) => tool.name),
		["subagent", "subagents", "subagent_jobs", "subagent_result"],
	);
	assert.deepEqual(
		commands.map((command) => command.name),
		["subagent", "subagent-jobs"],
	);
});
