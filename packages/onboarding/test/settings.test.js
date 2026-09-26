import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
	getSettingsPath,
	packageIdForEntry,
	reconcilePackages,
	selectedPackageIds,
	writeSettings,
} from "../extensions/settings.js";

const manifest = {
	packages: [
		{
			id: "onboarding",
			hidden: true,
			alwaysInstall: true,
			source: {
				mode: "workspace",
				path: "packages/onboarding",
				npm: "pi-rakit-onboarding",
			},
		},
		{
			id: "feature",
			source: {
				mode: "workspace",
				path: "packages/feature",
				npm: "@scope/feature",
			},
		},
		{
			id: "external",
			source: { mode: "npm", name: "external-pkg", version: "1.2.3" },
		},
	],
};

test("recognizes managed npm and development workspace sources", () => {
	assert.equal(packageIdForEntry("npm:@scope/feature@9.0.0", manifest), "feature");
	assert.equal(
		packageIdForEntry("../../packages/feature", manifest),
		"feature",
	);
	assert.equal(
		packageIdForEntry({ source: "npm:external-pkg@1.0.0", skills: [] }, manifest),
		"external",
	);
	assert.equal(packageIdForEntry("npm:not-managed", manifest), null);
});

test("finds selected package ids without duplicates", () => {
	assert.deepEqual(
		selectedPackageIds(
			{
				packages: [
					"npm:@scope/feature",
					"npm:@scope/feature@2.0.0",
					"npm:external-pkg@1.2.3",
				],
			},
			manifest,
		),
		["feature", "external"],
	);
});

test("replaces managed entries, preserves unrelated entries, and keeps onboarding", () => {
	const unrelatedObject = { source: "npm:unrelated", extensions: [] };
	const result = reconcilePackages(
		{
			theme: "dark",
			packages: [
				"npm:@scope/feature@0.5.0",
				"npm:external-pkg@1.2.3",
				"npm:unrelated-string",
				unrelatedObject,
			],
		},
		manifest,
		["feature"],
	);

	assert.equal(result.theme, "dark");
	assert.deepEqual(result.packages, [
		"npm:unrelated-string",
		unrelatedObject,
		"npm:pi-rakit-onboarding",
		"npm:@scope/feature",
	]);
});

test("updates managed object sources while preserving their resource filters", () => {
	assert.deepEqual(
		reconcilePackages(
			{
				packages: [
					{ source: "npm:external-pkg@1.0.0", extensions: ["main.js"] },
				],
			},
			manifest,
			["external"],
		).packages,
		[
			"npm:pi-rakit-onboarding",
			{ source: "npm:external-pkg@1.2.3", extensions: ["main.js"] },
		],
	);
});

test("writes settings atomically and resolves both scopes", () => {
	const root = mkdtempSync(path.join(tmpdir(), "pi-rakit-onboarding-"));
	try {
		const projectPath = getSettingsPath("project", path.join(root, "project"), root);
		const globalPath = getSettingsPath("global", "/unused", root);
		writeSettings(projectPath, { packages: ["npm:one"] });
		assert.deepEqual(JSON.parse(readFileSync(projectPath, "utf8")), {
			packages: ["npm:one"],
		});
		assert.equal(globalPath, path.join(root, ".pi", "agent", "settings.json"));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
