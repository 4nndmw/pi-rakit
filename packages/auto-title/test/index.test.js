import assert from "node:assert/strict";
import test from "node:test";
import autoTitleExtension, { createSessionTitle } from "../extensions/index.js";

test("creates concise titles from prompts", () => {
	assert.equal(
		createSessionTitle("Please fix the login flow. Also add tests."),
		"Please fix the login flow",
	);
	assert.equal(
		createSessionTitle("/plan   # Build a cache layer"),
		"Build a cache layer",
	);
	assert.equal(createSessionTitle("```js\nx()\n```"), "code");
});
test("does not replace an existing session name", () => {
	const handlers = new Map();
	let title;
	const pi = {
		on: (name, fn) => handlers.set(name, fn),
		getSessionName: () => "Kept",
		setSessionName: (value) => {
			title = value;
		},
	};
	autoTitleExtension(pi);
	handlers.get("before_agent_start")({ prompt: "New title" });
	assert.equal(title, undefined);
});
