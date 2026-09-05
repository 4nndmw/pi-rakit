import assert from "node:assert/strict";
import test from "node:test";
import {
	cleanStepText,
	extractDoneSteps,
	extractTodoItems,
	isSafeCommand,
	markCompletedSteps,
} from "../extensions/utils.js";

test("allows conservative read-only shell commands", () => {
	for (const command of [
		"ls -la",
		"git status --short",
		"git diff -- src",
		"find src -name '*.js'",
		"sed -n 1,20p README.md",
		"git ls-files packages",
		"node --version",
	]) {
		assert.equal(isSafeCommand(command), true, command);
	}
});

test("blocks mutations and shell composition", () => {
	for (const command of [
		"rm -rf build",
		"git status && git reset --hard",
		"cat file > copy",
		"cat file | tee copy",
		"echo $(touch file)",
		"find . -delete",
		"sort -o output input",
		"git diff --output=patch.txt",
		"git show -ooutput.txt HEAD",
		"git diff --ext-diff",
		"git log --textconv",
		"git ls-remote origin",
		"fd -x touch {}",
		"fd -Xtouch {}",
		"rg --pre ./mutator pattern",
		"bat --pager 'sh -c touch-file' README.md",
		"bat -P README.md",
		"diff --output=changes.patch a b",
		"tree -o listing.txt",
		"date --set tomorrow",
		"sed -n '1w output' README.md",
		"/tmp/ls",
		"./ls",
		"node script.js",
		"curl https://example.com",
		"npm view example version",
		"npm audit",
		"npm install package",
	]) {
		assert.equal(isSafeCommand(command), false, command);
	}
});

test("extracts and completes normalized plan todos", () => {
	assert.equal(cleanStepText("Update the **settings parser**"), "Settings parser");
	const todos = extractTodoItems(`Result\n\nPlan:\n1. Read the current parser\n2) **Add focused tests**\n3. Verify all checks pass`);
	assert.deepEqual(todos, [
		{ step: 1, text: "Current parser", completed: false },
		{ step: 2, text: "Focused tests", completed: false },
		{ step: 3, text: "All checks pass", completed: false },
	]);
	assert.deepEqual(extractDoneSteps("[DONE:2] [done:2] [DONE:9]"), [2, 2, 9]);
	assert.equal(markCompletedSteps("Finished [DONE:2] [DONE:2]", todos), 1);
	assert.equal(todos[1].completed, true);
});
