import assert from "node:assert/strict";
import test from "node:test";
import setupProviders from "../extensions/index.js";

test("registers the setup-custom-providers command and session hook", () => {
	const calls = [];
	const pi = {
		registerCommand(name, config) {
			calls.push({ type: "command", name, config });
		},
		registerProvider(name) {
			calls.push({ type: "provider", name });
		},
		unregisterProvider() {},
		on(event) {
			calls.push({ type: "event", event });
		},
	};

	setupProviders(pi);

	const command = calls.find((call) => call.type === "command");
	assert.ok(command, "expected a registered command");
	assert.equal(command.name, "setup-custom-providers");
	assert.match(command.config.description, /wizard/i);
	assert.equal(typeof command.config.handler, "function");

	assert.ok(
		calls.some((call) => call.type === "event" && call.event === "session_start"),
		"expected a session_start hook",
	);
});
