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
			id: "doctor",
			label: "Doctor",
			source: {
				mode: "workspace",
				path: "packages/doctor",
				npm: "pi-rakit-doctor",
			},
		},
		{
			id: "worktree",
			label: "Worktree",
			source: {
				mode: "workspace",
				path: "packages/worktree",
				npm: "pi-rakit-worktree",
			},
		},
		{
			id: "git",
			label: "Git",
			source: {
				mode: "workspace",
				path: "packages/git",
				npm: "pi-rakit-git",
			},
		},
		{
			id: "biome",
			label: "Biome",
			source: {
				mode: "workspace",
				path: "packages/biome",
				npm: "pi-rakit-biome",
			},
		},
		{
			id: "ponytail",
			label: "Ponytail",
			source: {
				mode: "npm",
				name: "@dietrichgebert/ponytail",
				version: "4.9.0",
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

test("uses the Doctor npm package outside development mode", () => {
	const plan = buildInstallPlan(["doctor"], manifest, options);
	assert.deepEqual(plan.packageSources, ["npm:pi-rakit-doctor"]);
});

test("uses the Worktree npm package outside development mode", () => {
	const plan = buildInstallPlan(["worktree"], manifest, options);
	assert.deepEqual(plan.packageSources, ["npm:pi-rakit-worktree"]);
});

test("uses the Worktree workspace path in development mode", () => {
	const plan = buildInstallPlan(["worktree"], manifest, {
		...options,
		devMode: true,
	});
	assert.equal(plan.packageSources[0], "../../packages/worktree");
});

test("resolves the Git package for npm and development mode", () => {
	const published = buildInstallPlan(["git"], manifest, options);
	assert.deepEqual(published.packageSources, ["npm:pi-rakit-git"]);
	const development = buildInstallPlan(["git"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/git"]);
});

test("resolves the Biome package for npm and development mode", () => {
	const published = buildInstallPlan(["biome"], manifest, options);
	assert.deepEqual(published.packageSources, ["npm:pi-rakit-biome"]);
	const development = buildInstallPlan(["biome"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/biome"]);
});

test("pins scoped external packages to the configured version", () => {
	const plan = buildInstallPlan(["ponytail"], manifest, options);
	assert.deepEqual(plan.packageSources, ["npm:@dietrichgebert/ponytail@4.9.0"]);
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
