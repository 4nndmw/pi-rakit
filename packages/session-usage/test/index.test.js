import assert from "node:assert/strict";
import test from "node:test";
import {
	aggregateEntries,
	cacheHitRate,
	collectUsage,
	formatUsage,
	parseSessionUsage,
	summarizeSession,
	usageTotals,
} from "../extensions/index.js";

const entries = [
	{
		type: "message",
		message: {
			role: "assistant",
			usage: { input: 100, output: 20, cacheRead: 5, cost: { total: 0.01 } },
		},
	},
	{ type: "message", message: { role: "user", usage: { input: 999 } } },
];

test("collects assistant usage", () => {
	assert.deepEqual(collectUsage(entries), {
		input: 100,
		output: 20,
		cacheRead: 5,
		cacheWrite: 0,
		cost: 0.01,
	});
	assert.match(
		formatUsage(collectUsage(entries)),
		/in 100 · out 20 · cache 5 · \$0\.0100/,
	);
});

test("parses JSONL and ignores incomplete lines", () => {
	assert.equal(
		parseSessionUsage(`${JSON.stringify(entries[0])}\n{`).output,
		20,
	);
});

test("normalizes usage totals including object cost", () => {
	assert.deepEqual(
		usageTotals({
			input: 10,
			output: 2,
			cacheRead: 3,
			cacheWrite: 1,
			cost: { total: 0.5 },
		}),
		{ input: 10, output: 2, cacheRead: 3, cacheWrite: 1, cost: 0.5 },
	);
});

test("aggregates usage by model and by day", () => {
	const byModelEntries = [
		{
			type: "message",
			timestamp: "2026-09-25T10:00:00.000Z",
			message: {
				role: "assistant",
				provider: "anthropic",
				model: "claude",
				usage: { input: 100, output: 10 },
			},
		},
		{
			type: "message",
			timestamp: "2026-09-26T10:00:00.000Z",
			message: {
				role: "assistant",
				provider: "anthropic",
				model: "claude",
				usage: { input: 50, output: 5 },
			},
		},
		{
			type: "message",
			timestamp: "2026-09-26T11:00:00.000Z",
			message: {
				role: "assistant",
				provider: "openai",
				model: "gpt",
				usage: { input: 20, output: 2 },
			},
		},
	];
	const { usage, byModel, byDay } = aggregateEntries(byModelEntries);
	assert.equal(usage.input, 170);
	assert.equal(usage.output, 17);
	assert.equal(byModel.get("anthropic/claude").input, 150);
	assert.equal(byModel.get("openai/gpt").output, 2);
	assert.equal(byDay.get("2026-09-25").input, 100);
	assert.equal(byDay.get("2026-09-26").input, 70);
});

test("computes the cache hit rate", () => {
	assert.equal(cacheHitRate({ input: 30, cacheRead: 70, cacheWrite: 0 }), 0.7);
	assert.equal(cacheHitRate({ input: 0, cacheRead: 0 }), 0);
});

test("summarizes a session file with its header and usage", () => {
	const content = [
		JSON.stringify({
			type: "session",
			version: 3,
			id: "abc",
			timestamp: "2026-09-26T00:00:00.000Z",
			cwd: "/p",
		}),
		JSON.stringify({
			type: "message",
			timestamp: "2026-09-26T00:01:00.000Z",
			message: {
				role: "assistant",
				provider: "p",
				model: "m",
				usage: { input: 5, output: 1 },
			},
		}),
	].join("\n");
	const summary = summarizeSession(content);
	assert.equal(summary.id, "abc");
	assert.equal(summary.startedAt, "2026-09-26T00:00:00.000Z");
	assert.equal(summary.usage.input, 5);
});
