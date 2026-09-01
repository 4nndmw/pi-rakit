import assert from "node:assert/strict";
import test from "node:test";
import { formatPackageList, parseArgs } from "../src/cli.js";

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

test("parses package listing and rejects selection options", () => {
	assert.equal(parseArgs(["--list-packages"]).listPackages, true);
	assert.throws(
		() => parseArgs(["--list-packages", "--package", "ponytail"]),
		/--list-packages cannot be combined with package selection options/,
	);
	assert.throws(
		() => parseArgs(["--list-packages", "--select-all"]),
		/--list-packages cannot be combined with package selection options/,
	);
});

test("formats visible package ids, labels, and npm sources", () => {
	const output = formatPackageList({
		packages: [
			{
				id: "workspace",
				label: "Workspace",
				source: { mode: "workspace", npm: "example-workspace" },
			},
			{
				id: "external",
				label: "External",
				source: { mode: "npm", name: "example-external", version: "1.2.3" },
			},
			{
				id: "hidden",
				label: "Hidden",
				hidden: true,
				source: { mode: "npm", name: "example-hidden" },
			},
		],
	});

	assert.equal(
		output,
		"workspace\tWorkspace\tnpm:example-workspace\n" +
			"external\tExternal\tnpm:example-external@1.2.3",
	);
});
