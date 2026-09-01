import assert from "node:assert/strict";
import test from "node:test";
import biomeExtension, {
	parseBiomeCommand,
	runBiome,
} from "../extensions/index.js";

function createRunner(response = {}) {
	const calls = [];
	const runBiome = (args, cwd) => {
		calls.push({ args, cwd });
		return { status: 0, stdout: "Checked 3 files.\n", stderr: "", ...response };
	};
	return { calls, runBiome };
}

test("parses supported actions and safe targets", () => {
	assert.deepEqual(parseBiomeCommand("check"), {
		action: "check",
		targets: [],
	});
	assert.deepEqual(parseBiomeCommand("lint src test"), {
		action: "lint",
		targets: ["src", "test"],
	});
	assert.throws(() => parseBiomeCommand("fix"), /Usage:/);
	assert.throws(
		() => parseBiomeCommand("check --write"),
		/cannot start with a hyphen/,
	);
});

test("runs read-only checks against the current project", () => {
	const runner = createRunner();
	const result = runBiome("check", [], {
		cwd: "/project",
		runBiome: runner.runBiome,
	});
	assert.equal(result.status, 0);
	assert.equal(result.output, "Checked 3 files.");
	assert.deepEqual(runner.calls, [{ args: ["check", "."], cwd: "/project" }]);
});

test("adds write only to the format action", () => {
	const runner = createRunner();
	runBiome("format", ["src", "test"], {
		cwd: "/project",
		runBiome: runner.runBiome,
	});
	assert.deepEqual(runner.calls, [
		{ args: ["format", "--write", "src", "test"], cwd: "/project" },
	]);
});

test("returns failed command output without throwing", () => {
	const runner = createRunner({
		status: 1,
		stdout: "",
		stderr: "lint error\n",
	});
	assert.deepEqual(runBiome("lint", ["src"], { runBiome: runner.runBiome }), {
		args: ["lint", "src"],
		cwd: process.cwd(),
		status: 1,
		output: "lint error",
	});
});

test("registers the biome command", async () => {
	let command;
	biomeExtension({
		registerCommand(name, definition) {
			command = { name, ...definition };
		},
	});
	assert.equal(command.name, "biome");
	assert.match(command.description, /Biome/);

	const notifications = [];
	await command.handler("unknown", {
		ui: {
			notify(message, level) {
				notifications.push({ message, level });
			},
		},
	});
	assert.equal(notifications.at(-1).level, "error");
	assert.match(notifications.at(-1).message, /Usage:/);
});
