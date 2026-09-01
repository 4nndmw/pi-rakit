import assert from "node:assert/strict";
import test from "node:test";
import {
	collectUsage,
	formatUsage,
	parseSessionUsage,
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
