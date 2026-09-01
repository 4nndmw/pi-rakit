import assert from "node:assert/strict";
import test from "node:test";
import { describeSession, isInside } from "../extensions/index.js";

test("describes named and unnamed sessions", () => {
	const content = `${JSON.stringify({ type: "session", timestamp: "2026-09-01T00:00:00Z" })}\n${JSON.stringify({ type: "message", message: { role: "user", content: [{ type: "text", text: "Fix the login flow" }] } })}`;
	assert.match(describeSession(content, "x.jsonl"), /^Fix the login flow — /);
});
test("accepts only paths below session directory", () => {
	assert.equal(isInside("/tmp/sessions", "/tmp/sessions/a.jsonl"), true);
	assert.equal(isInside("/tmp/sessions", "/tmp/other.jsonl"), false);
});
