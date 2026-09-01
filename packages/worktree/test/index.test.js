import assert from "node:assert/strict";
import test from "node:test";
import {
	createWorktree,
	formatWorktrees,
	parseWorktrees,
	removeWorktree,
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

test("parses and formats porcelain worktree output", () => {
	const worktrees = parseWorktrees(
		"worktree /repo\nHEAD abc\nbranch refs/heads/main\n\nworktree /repo-task\nHEAD def\nbranch refs/heads/worktree/task\n",
	);
	assert.deepEqual(worktrees, [
		{ path: "/repo", branch: "main", bare: false },
		{ path: "/repo-task", branch: "worktree/task", bare: false },
	]);
	assert.match(formatWorktrees(worktrees), /worktree\/task/);
});

test("creates a prefixed branch in a sibling directory", () => {
	const runner = createRunner([
		{ stdout: "/projects/repo\n" },
		{ stdout: "" },
		{ status: 1 },
		{ status: 0 },
	]);
	const created = createWorktree("task-1", {
		cwd: "/projects/repo",
		runGit: runner.runGit,
	});

	assert.deepEqual(created, {
		name: "task-1",
		branch: "worktree/task-1",
		path: "/projects/repo-task-1",
	});
	assert.deepEqual(runner.calls.at(-1).args, [
		"worktree",
		"add",
		"-b",
		"worktree/task-1",
		"/projects/repo-task-1",
	]);
});

test("rejects protected names and dirty current worktrees", () => {
	assert.throws(() => createWorktree("main"), /Protected branch/);
	const runner = createRunner([
		{ stdout: "/repo\n" },
		{ stdout: " M file.js\n" },
	]);
	assert.throws(
		() => createWorktree("task", { cwd: "/repo", runGit: runner.runGit }),
		/uncommitted changes/,
	);
});

test("removes only a clean matching worktree without force", () => {
	const runner = createRunner([
		{ stdout: "/repo\n" },
		{ stdout: "/repo\n" },
		{
			stdout:
				"worktree /repo\nbranch refs/heads/main\n\nworktree /repo-task\nbranch refs/heads/worktree/task\n",
		},
		{ stdout: "" },
		{ status: 0 },
	]);
	const removed = removeWorktree("task", {
		cwd: "/repo",
		runGit: runner.runGit,
	});

	assert.equal(removed.path, "/repo-task");
	assert.deepEqual(runner.calls.at(-1).args, [
		"worktree",
		"remove",
		"/repo-task",
	]);
	assert.equal(runner.calls.at(-1).args.includes("--force"), false);
});

test("refuses to remove a dirty target worktree", () => {
	const runner = createRunner([
		{ stdout: "/repo\n" },
		{ stdout: "/repo\n" },
		{
			stdout:
				"worktree /repo\nbranch refs/heads/main\n\nworktree /repo-task\nbranch refs/heads/worktree/task\n",
		},
		{ stdout: "?? notes.txt\n" },
	]);
	assert.throws(
		() => removeWorktree("task", { cwd: "/repo", runGit: runner.runGit }),
		/Target worktree has uncommitted changes/,
	);
});
