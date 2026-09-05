import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { visibleWidth } from "@earendil-works/pi-tui";
import rakitUiExtension, {
	collectUsage,
	compactPath,
	createFooter,
	createHeader,
	fitSides,
	formatMetric,
} from "../extensions/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function theme() {
	return {
		bold: (text) => text,
		fg: (_color, text) => text,
	};
}

function createHarness(mode = "tui") {
	const handlers = new Map();
	const commands = new Map();
	const calls = [];
	const oldTheme = theme();
	const oldEditor = () => "old";
	const ui = {
		theme: oldTheme,
		getEditorComponent: () => oldEditor,
		setTheme: (value) => (calls.push(["theme", value]), { success: true }),
		setHeader: (value) => calls.push(["header", value]),
		setFooter: (value) => calls.push(["footer", value]),
		setEditorComponent: (value) => calls.push(["editor", value]),
		setWorkingIndicator: (value) => calls.push(["indicator", value]),
		notify: (...args) => calls.push(["notify", ...args]),
	};
	const ctx = {
		mode,
		ui,
		cwd: "/repo",
		model: { id: "model" },
		isIdle: () => true,
		sessionManager: { getEntries: () => [] },
		getContextUsage: () => undefined,
	};
	rakitUiExtension({
		on: (event, handler) => handlers.set(event, handler),
		registerCommand: (name, command) => commands.set(name, command),
	});
	return { calls, commands, ctx, handlers, oldEditor, oldTheme };
}

test("formats metrics, paths, usage, and constrained rows", () => {
	assert.equal(formatMetric(999), "999");
	assert.equal(formatMetric(1_250), "1.3k");
	assert.equal(formatMetric(12_500), "13k");
	assert.equal(formatMetric(2_300_000), "2.3m");
	assert.equal(compactPath("/home/test/project", "/home/test"), "~/project");
	assert.equal(compactPath("/repo", "/home/test"), "/repo");
	assert.deepEqual(
		collectUsage([
			{ type: "message", message: { role: "user" } },
			{ type: "message", message: { role: "assistant", usage: { input: 10, output: 4, cost: { total: 0.02 } } } },
			{ type: "message", message: { role: "assistant", usage: { input: 2, output: 1 } } },
		]),
		{ input: 12, output: 5, cost: 0.02 },
	);
	assert.equal(visibleWidth(fitSides("abcdef", "xyz", 6)), 6);
	assert.match(fitSides("abcdef", "xyz", 6), /^ab/);
	assert.equal(fitSides("a", "z", 6), "a    z");
});

test("header and footer respect width and preserve extension statuses", () => {
	const thm = theme();
	for (const width of [0, 1, 12, 40]) {
		for (const line of createHeader(thm).render(width)) assert.ok(visibleWidth(line) <= width);
	}
	let disposed = false;
	const footer = createFooter(
		{ requestRender() {} },
		thm,
		{
			onBranchChange: () => () => { disposed = true; },
			getGitBranch: () => "main",
			getExtensionStatuses: () => new Map([["z", " Z  status "], ["a", "A status"]]),
		},
		{
			cwd: "/repo",
			model: { id: "test-model" },
			thinkingLevel: "high",
			getContextUsage: () => ({ percent: 42 }),
			sessionManager: { getBranch: () => [] },
		},
	);
	const lines = footer.render(80);
	assert.match(lines[0], /\/repo · main/);
	assert.match(lines[0], /test-model · ctx 42%/);
	assert.match(lines[2], /^A status Z status$/);
	footer.dispose();
	assert.equal(disposed, true);
});

test("registers and restores global UI surfaces", () => {
	const harness = createHarness();
	assert.deepEqual([...harness.handlers.keys()], [
		"session_start",
		"session_shutdown",
	]);
	harness.handlers.get("session_start")({}, harness.ctx);
	assert.equal(harness.calls[0][0], "theme");
	assert.equal(harness.calls[0][1], "rakit");
	assert.deepEqual(harness.calls.slice(1).map(([name]) => name), ["header", "footer", "editor", "indicator"]);

	harness.handlers.get("session_shutdown")({}, harness.ctx);
	const restored = harness.calls.slice(-5);
	assert.deepEqual(restored.map(([name]) => name), ["header", "footer", "editor", "indicator", "theme"]);
	assert.equal(restored[2][1], harness.oldEditor);
	assert.equal(restored[4][1], harness.oldTheme);
});

test("toggles surfaces and reapplies the theme through the command", () => {
	const harness = createHarness();
	harness.handlers.get("session_start")({}, harness.ctx);
	const command = harness.commands.get("rakit-ui");

	harness.calls.length = 0;
	command.handler("off", harness.ctx);
	assert.deepEqual(harness.calls.slice(0, 5).map(([name]) => name), ["header", "footer", "editor", "indicator", "theme"]);

	harness.calls.length = 0;
	command.handler("on", harness.ctx);
	assert.deepEqual(harness.calls.slice(0, 5).map(([name]) => name), ["theme", "header", "footer", "editor", "indicator"]);

	harness.calls.length = 0;
	command.handler("theme", harness.ctx);
	assert.deepEqual(harness.calls[0], ["theme", "rakit"]);
	assert.deepEqual(harness.calls[1], ["notify", "Rakit theme applied", "info"]);
});

test("skips global surfaces outside TUI and handles commands", () => {
	const harness = createHarness("print");
	harness.handlers.get("session_start")({}, harness.ctx);
	assert.deepEqual(harness.calls, []);
	const command = harness.commands.get("rakit-ui");
	command.handler("", harness.ctx);
	command.handler("off", harness.ctx);
	command.handler("wat", harness.ctx);
	assert.deepEqual(
		harness.calls.filter(([name]) => name === "notify").map((call) => call.slice(1)),
		[
			["Pi Rakit UI: on", "info"],
			["Pi Rakit UI disabled", "info"],
			["Usage: /rakit-ui [on|off|theme]", "error"],
		],
	);
});

test("bundled theme declares all documented color tokens", () => {
	const value = JSON.parse(readFileSync(path.join(root, "themes", "rakit.json"), "utf8"));
	const required = [
		"accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text", "thinkingText",
		"selectedBg", "scrollbarTrack", "scrollbarThumb", "userMessageBg", "userMessageText", "customMessageBg", "customMessageText",
		"customMessageLabel", "toolPendingBg", "toolSuccessBg", "toolErrorBg", "toolTitle", "toolOutput", "mdHeading", "mdLink", "mdLinkUrl",
		"mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder", "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved",
		"toolDiffContext", "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType",
		"syntaxOperator", "syntaxPunctuation", "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "bashMode",
	];
	assert.equal(value.name, "rakit");
	for (const token of required) assert.ok(token in value.colors, `missing ${token}`);
});
