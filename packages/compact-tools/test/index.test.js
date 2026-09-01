import assert from "node:assert/strict";
import test from "node:test";
import { summarizeResult, truncate } from "../extensions/index.js";

test("truncates calls to one scannable line", () => {
	assert.equal(truncate("a\n  b"), "a b");
	assert.equal(truncate("123456", 5), "1234…");
});

test("summarizes text tool results", () => {
	assert.deepEqual(
		summarizeResult({ content: [{ type: "text", text: "one\ntwo" }] }),
		{ text: "one\ntwo", lines: 2, error: false },
	);
	assert.equal(
		summarizeResult({ content: [{ type: "text", text: "Error: no file" }] })
			.error,
		true,
	);
});
