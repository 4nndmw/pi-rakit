import assert from "node:assert/strict";
import test from "node:test";
import { buildInstallPlan } from "../src/install-plan.js";

const manifest = {
	packages: [
		{
			id: "base",
			label: "Base",
			source: { mode: "npm", name: "base-package", version: "1.2.3" },
		},
		{
			id: "feature",
			label: "Feature",
			requires: ["base"],
			source: {
				mode: "workspace",
				path: "packages/feature",
				npm: "@scope/feature",
			},
		},
		{
			id: "caveman",
			label: "Caveman",
			source: { mode: "npm", name: "caveman-pi", version: "1.0.0" },
		},
	],
};

const options = {
	repoRoot: "/repo",
	targetProjectDir: "/repo/demo",
	devMode: false,
};

test("expands requirements before selected packages", () => {
	const plan = buildInstallPlan(["feature"], manifest, options);
	assert.deepEqual(plan.ids, ["base", "feature"]);
	assert.deepEqual(plan.packageSources, [
		"npm:base-package@1.2.3",
		"npm:@scope/feature",
	]);
});

test("pins external packages to the configured version", () => {
	const plan = buildInstallPlan(["caveman"], manifest, options);
	assert.deepEqual(plan.packageSources, ["npm:caveman-pi@1.0.0"]);
});

test("rejects unknown package ids", () => {
	assert.throws(
		() => buildInstallPlan(["missing"], manifest, options),
		/Unknown package id/,
	);
});

test("creates settings-relative workspace paths in dev mode", () => {
	const plan = buildInstallPlan(["feature"], manifest, {
		...options,
		devMode: true,
	});
	assert.equal(plan.packageSources[1], "../../packages/feature");
});
