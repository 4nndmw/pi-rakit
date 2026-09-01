import assert from "node:assert/strict";
import test from "node:test";
import {
	countsFromEntries,
	formatDuration,
	SessionStats,
} from "../extensions/index.js";

test("formats session duration", () => {
	assert.equal(formatDuration(65000), "1m 5s");
	assert.equal(formatDuration(3660000), "1h 1m");
});
test("counts saved prompts, turns, and calls", () => {
	const entries = [
		{ type: "message", message: { role: "user" } },
		{
			type: "message",
			message: {
				role: "assistant",
				content: [{ type: "text" }, { type: "toolCall" }],
			},
		},
	];
	assert.deepEqual(countsFromEntries(entries), {
		prompts: 1,
		turns: 1,
		tools: 1,
	});
	const stats = new SessionStats(() => 70000);
	stats.load(entries, new Date(10000).toISOString());
	assert.equal(stats.text(), "1m 0s · 1p 1t 1 tools");
});
