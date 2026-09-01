import assert from "node:assert/strict";
import test from "node:test";
import tokenSpeedExtension, {
	TokenSpeedTracker,
	estimateTokens,
	formatTokenSpeed,
} from "../extensions/index.js";

function statusRecorder() {
	const calls = [];
	return {
		calls,
		ui: { setStatus: (key, text) => calls.push({ key, text }) },
	};
}

test("estimates and formats live token speed", () => {
	assert.equal(estimateTokens("12345678"), 2);
	assert.equal(estimateTokens(""), 0);
	assert.equal(formatTokenSpeed(12.345, true), "⚡ ~12.3 tok/s");
	assert.equal(formatTokenSpeed(123.4), "⚡ 123 tok/s");
});

test("reports estimated live speed and exact final usage", () => {
	let now = 1000;
	const tracker = new TokenSpeedTracker({ now: () => now });
	const status = statusRecorder();

	tracker.record("1234", status.ui);
	assert.deepEqual(status.calls, []);
	now += 200;
	tracker.record("5678", status.ui);
	assert.deepEqual(status.calls.at(-1), {
		key: "token-speed",
		text: "⚡ ~10.0 tok/s",
	});
	now += 800;
	tracker.finish(20, status.ui);
	assert.deepEqual(status.calls.at(-1), {
		key: "token-speed",
		text: "⚡ 20.0 tok/s",
	});
});

test("registers Pi streaming lifecycle handlers", () => {
	const handlers = new Map();
	tokenSpeedExtension({ on: (event, handler) => handlers.set(event, handler) });
	assert.deepEqual(
		[...handlers.keys()],
		["message_start", "message_update", "message_end", "session_shutdown"],
	);

	const status = statusRecorder();
	handlers.get("message_start")(
		{ message: { role: "assistant" } },
		{ ui: status.ui },
	);
	assert.deepEqual(status.calls.at(-1), {
		key: "token-speed",
		text: undefined,
	});
	handlers.get("session_shutdown")({}, { ui: status.ui });
	assert.equal(status.calls.at(-1).text, undefined);
});
