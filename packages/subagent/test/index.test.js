import assert from "node:assert/strict";
import test from "node:test";
import subagentExtension, {
	buildPrompt,
	listAgents,
	parseCommand,
	resolveAgent,
} from "../extensions/index.js";

test("lists the built-in agents", () => {
	assert.deepEqual(
		listAgents().map((agent) => agent.id),
		["general", "reviewer", "scout", "planner", "tester"],
	);
});

test("resolves agents with a general fallback", () => {
	assert.equal(resolveAgent("reviewer").id, "reviewer");
	assert.equal(resolveAgent("REVIEWER").id, "reviewer");
	assert.equal(resolveAgent("unknown").id, "general");
	assert.equal(resolveAgent(undefined).id, "general");
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

	// A known word alone is the task, not an agent prefix.
	const bare = parseCommand("reviewer");
	assert.equal(bare.agent.id, "general");
	assert.equal(bare.task, "reviewer");
});

test("registers the subagent tool and command", () => {
	const tools = [];
	const commands = [];
	subagentExtension({
		registerTool: (tool) => tools.push(tool),
		registerCommand: (name, config) => commands.push({ name, config }),
	});
	assert.equal(tools.length, 1);
	assert.equal(tools[0].name, "subagent");
	assert.equal(typeof tools[0].execute, "function");
	assert.equal(tools[0].executionMode, "sequential");
	assert.ok(commands.some((command) => command.name === "subagent"));
});
