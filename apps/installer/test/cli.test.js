import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs } from "../src/cli.js";

test("parses repeatable package selections", () => {
	const options = parseArgs([
		"--package",
		"ponytail",
		"--package",
		"caveman",
		"--yes",
	]);

	assert.deepEqual(options.packageIds, ["ponytail", "caveman"]);
	assert.equal(options.yes, true);
	assert.equal(options.selectAll, false);
});

test("rejects package selection combined with select-all", () => {
	assert.throws(
		() => parseArgs(["--package", "ponytail", "--select-all"]),
		/--package cannot be combined with --select-all/,
	);
});

test("requires a package id", () => {
	assert.throws(() => parseArgs(["--package"]), /--package requires a value/);
});
