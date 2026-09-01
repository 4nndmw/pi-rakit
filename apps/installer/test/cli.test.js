import assert from "node:assert/strict";
import test from "node:test";
import { formatPackageList, parseArgs } from "../src/cli.js";

test("parses version and nonmutating flags", () => {
	assert.equal(parseArgs(["--version"]).version, true);
	assert.equal(parseArgs(["-v"]).version, true);
	assert.equal(parseArgs(["--dry-run"]).dryRun, true);
	assert.equal(parseArgs(["--check"]).check, true);
	assert.throws(
		() => parseArgs(["--dry-run", "--check"]),
		/--dry-run cannot be combined with --check/,
	);
});

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

test("parses package listing options and rejects incompatible options", () => {
	const options = parseArgs(["--list-packages", "--json"]);
	assert.equal(options.listPackages, true);
	assert.equal(options.json, true);
	assert.throws(
		() => parseArgs(["--list-packages", "--package", "ponytail"]),
		/--list-packages cannot be combined with package selection options/,
	);
	assert.throws(
		() => parseArgs(["--list-packages", "--select-all"]),
		/--list-packages cannot be combined with package selection options/,
	);
	assert.equal(parseArgs(["--dry-run", "--json"]).json, true);
	assert.equal(parseArgs(["--check", "--json"]).json, true);
	assert.throws(
		() => parseArgs(["--json"]),
		/--json requires --list-packages, --dry-run, or --check/,
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

test("formats visible packages as structured JSON", () => {
	const output = formatPackageList(
		{
			packages: [
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
		},
		{ json: true },
	);

	assert.deepEqual(JSON.parse(output), [
		{
			id: "external",
			label: "External",
			source: "npm:example-external@1.2.3",
		},
	]);
});
