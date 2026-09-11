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
			id: "plan-mode",
			label: "Plan Mode",
			source: {
				mode: "workspace",
				path: "packages/plan-mode",
				npm: "@4nndmw/plan-mode",
			},
		},
		{
			id: "ui",
			label: "Rakit UI",
			source: {
				mode: "workspace",
				path: "packages/ui",
				npm: "@4nndmw/ui",
			},
		},
		{
			id: "doctor",
			label: "Doctor",
			source: {
				mode: "workspace",
				path: "packages/doctor",
				npm: "@4nndmw/doctor",
			},
		},
		{
			id: "worktree",
			label: "Worktree",
			source: {
				mode: "workspace",
				path: "packages/worktree",
				npm: "@4nndmw/worktree",
			},
		},
		{
			id: "git",
			label: "Git",
			source: {
				mode: "workspace",
				path: "packages/git",
				npm: "@4nndmw/git",
			},
		},
		{
			id: "biome",
			label: "Biome",
			source: {
				mode: "workspace",
				path: "packages/biome",
				npm: "@4nndmw/biome",
			},
		},
		{
			id: "token-speed",
			label: "Token Speed",
			source: {
				mode: "workspace",
				path: "packages/token-speed",
				npm: "@4nndmw/token-speed",
			},
		},
		...[
			"session-usage",
			"session-stats",
			"session-delete",
			"compact-tools",
			"auto-title",
		].map((id) => ({
			id,
			label: id,
			source: {
				mode: "workspace",
				path: `packages/${id}`,
				npm: `@4nndmw/${id}`,
			},
		})),
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

test("always includes mandatory hidden packages once", () => {
	const mandatoryManifest = {
		packages: [
			{
				id: "onboarding",
				alwaysInstall: true,
				source: {
					mode: "workspace",
					path: "packages/onboarding",
					npm: "@4nndmw/onboarding",
				},
			},
		],
	};
	const emptyPlan = buildInstallPlan([], mandatoryManifest, options);
	assert.deepEqual(emptyPlan.ids, ["onboarding"]);
	assert.deepEqual(emptyPlan.packageSources, ["npm:@4nndmw/onboarding"]);
	assert.deepEqual(
		buildInstallPlan(["onboarding"], mandatoryManifest, options).ids,
		["onboarding"],
	);
});

test("expands requirements before selected packages", () => {
	const plan = buildInstallPlan(["feature"], manifest, options);
	assert.deepEqual(plan.ids, ["base", "feature"]);
	assert.deepEqual(plan.packageSources, [
		"npm:base-package@1.2.3",
		"npm:@scope/feature",
	]);
});

test("resolves Plan Mode for npm and development mode", () => {
	const published = buildInstallPlan(["plan-mode"], manifest, options);
	assert.deepEqual(published.packageSources, ["npm:@4nndmw/plan-mode"]);
	const development = buildInstallPlan(["plan-mode"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/plan-mode"]);
});

test("resolves Rakit UI for npm and development mode", () => {
	const published = buildInstallPlan(["ui"], manifest, options);
	assert.deepEqual(published.packageSources, ["npm:@4nndmw/ui"]);
	const development = buildInstallPlan(["ui"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/ui"]);
});

test("uses the Doctor npm package outside development mode", () => {
	const plan = buildInstallPlan(["doctor"], manifest, options);
	assert.deepEqual(plan.packageSources, ["npm:@4nndmw/doctor"]);
});

test("uses the Worktree npm package outside development mode", () => {
	const plan = buildInstallPlan(["worktree"], manifest, options);
	assert.deepEqual(plan.packageSources, ["npm:@4nndmw/worktree"]);
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
	assert.deepEqual(published.packageSources, ["npm:@4nndmw/git"]);
	const development = buildInstallPlan(["git"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/git"]);
});

test("resolves the Biome package for npm and development mode", () => {
	const published = buildInstallPlan(["biome"], manifest, options);
	assert.deepEqual(published.packageSources, ["npm:@4nndmw/biome"]);
	const development = buildInstallPlan(["biome"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/biome"]);
});

test("resolves Token Speed for npm and development mode", () => {
	const published = buildInstallPlan(["token-speed"], manifest, options);
	assert.deepEqual(published.packageSources, ["npm:@4nndmw/token-speed"]);
	const development = buildInstallPlan(["token-speed"], manifest, {
		...options,
		devMode: true,
	});
	assert.deepEqual(development.packageSources, ["../../packages/token-speed"]);
});

test("resolves session utilities for npm and development mode", () => {
	for (const id of [
		"session-usage",
		"session-stats",
		"session-delete",
		"compact-tools",
		"auto-title",
	]) {
		const published = buildInstallPlan([id], manifest, options);
		assert.deepEqual(published.packageSources, [`npm:@4nndmw/${id}`]);
		const development = buildInstallPlan([id], manifest, {
			...options,
			devMode: true,
		});
		assert.deepEqual(development.packageSources, [`../../packages/${id}`]);
	}
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
