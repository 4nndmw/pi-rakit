import assert from "node:assert/strict";
import test from "node:test";
import {
	commitStaged,
	currentBranch,
	gitStatus,
} from "../extensions/index.js";

function createRunner(responses) {
	const calls = [];
	const runGit = (args, cwd) => {
		calls.push({ args, cwd });
		const response = responses.shift();
		if (!response) throw new Error(`Unexpected git call: ${args.join(" ")}`);
		return { status: 0, stdout: "", stderr: "", ...response };
	};
	return { calls, runGit };
}

test("reports concise repository status", () => {
	const runner = createRunner([
		{ stdout: "/repo\n" },
		{ stdout: "## feature\nM  staged.js\n" },
	]);
	assert.equal(
		gitStatus({ cwd: "/repo/subdir", runGit: runner.runGit }),
		"## feature\nM  staged.js",
	);
	assert.deepEqual(runner.calls.at(-1), {
		args: ["status", "--short", "--branch"],
		cwd: "/repo",
	});
});

test("reports branches and detached commits", () => {
	const branchRunner = createRunner([
		{ stdout: "/repo\n" },
		{ stdout: "feature/git-package\n" },
	]);
	assert.equal(currentBranch({ runGit: branchRunner.runGit }), "feature/git-package");

	const detachedRunner = createRunner([
		{ stdout: "/repo\n" },
		{ status: 1 },
		{ stdout: "abc1234\n" },
	]);
	assert.equal(currentBranch({ runGit: detachedRunner.runGit }), "detached at abc1234");
});

test("commits only already-staged changes", () => {
	const runner = createRunner([
		{ stdout: "/repo\n" },
		{ status: 1 },
		{ stdout: "[main abc1234] Explain change\n" },
	]);
	assert.equal(
		commitStaged("  Explain change  ", { cwd: "/repo", runGit: runner.runGit }),
		"Explain change",
	);
	assert.deepEqual(runner.calls.map(({ args }) => args), [
		["rev-parse", "--show-toplevel"],
		["diff", "--cached", "--quiet"],
		["commit", "-m", "Explain change"],
	]);
});

test("refuses empty commits and missing messages", () => {
	assert.throws(() => commitStaged(" "), /message is required/);
	const runner = createRunner([
		{ stdout: "/repo\n" },
		{ status: 0 },
	]);
	assert.throws(
		() => commitStaged("Message", { runGit: runner.runGit }),
		/No staged changes/,
	);
});
