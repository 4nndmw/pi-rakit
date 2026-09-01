import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

export function loadManifest(manifestPath, options = {}) {
	if (!existsSync(manifestPath))
		throw new Error(`Manifest not found: ${manifestPath}`);

	let manifest;
	try {
		manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	} catch (error) {
		throw new Error(
			`Invalid manifest JSON at ${manifestPath}: ${error.message}`,
		);
	}

	validateManifest(manifest, manifestPath, options);
	return manifest;
}

export function validateManifest(manifest, manifestPath, options = {}) {
	assert(
		manifest && typeof manifest === "object",
		"Manifest must be an object.",
	);
	assert(manifest.version === 1, "Unsupported manifest version.");
	assert(
		Array.isArray(manifest.packages),
		"Manifest packages must be an array.",
	);

	const ids = new Set();
	for (const item of manifest.packages) {
		assert(
			typeof item.id === "string" && item.id,
			"Every package needs an id.",
		);
		assert(!ids.has(item.id), `Duplicate package id: ${item.id}`);
		ids.add(item.id);
		assert(
			typeof item.label === "string" && item.label,
			`Package ${item.id} needs a label.`,
		);
		assert(
			item.source && typeof item.source === "object",
			`Package ${item.id} needs a source.`,
		);

		if (item.source.mode === "workspace") {
			assert(
				item.source.path,
				`Workspace package ${item.id} needs source.path.`,
			);
			assert(item.source.npm, `Workspace package ${item.id} needs source.npm.`);
			if (options.validateWorkspacePaths !== false) {
				const workspaceRoot =
					options.workspaceRoot ?? path.dirname(manifestPath);
				const workspacePath = path.resolve(workspaceRoot, item.source.path);
				assert(
					existsSync(workspacePath),
					`Workspace path does not exist: ${workspacePath}`,
				);
			}
		} else if (item.source.mode === "npm") {
			assert(item.source.name, `npm package ${item.id} needs source.name.`);
		} else {
			throw new Error(
				`Unsupported source mode for ${item.id}: ${item.source.mode}`,
			);
		}

		assert(
			!item.requires || Array.isArray(item.requires),
			`Package ${item.id} requires must be an array.`,
		);
	}

	for (const item of manifest.packages) {
		for (const requiredId of item.requires ?? []) {
			assert(
				ids.has(requiredId),
				`Package ${item.id} requires unknown package: ${requiredId}`,
			);
		}
	}
}

export function getDefaultPackageIds(manifest) {
	return manifest.packages
		.filter((item) => !item.hidden && item.enabledByDefault)
		.map((item) => item.id);
}
