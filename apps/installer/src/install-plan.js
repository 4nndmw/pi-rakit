import path from "node:path";

function expandRequirements(selectedIds, packageMap) {
	const resolved = new Set();
	const visiting = new Set();

	function visit(id) {
		if (resolved.has(id)) return;
		if (visiting.has(id))
			throw new Error(`Circular package requirement involving: ${id}`);

		const item = packageMap.get(id);
		if (!item) throw new Error(`Unknown package id: ${id}`);

		visiting.add(id);
		for (const requiredId of item.requires ?? []) visit(requiredId);
		visiting.delete(id);
		resolved.add(id);
	}

	for (const id of selectedIds) visit(id);
	return [...resolved];
}

function sourceFor(item, options) {
	if (item.source.mode === "npm") {
		const version = item.source.version ? `@${item.source.version}` : "";
		return `npm:${item.source.name}${version}`;
	}

	if (!options.devMode) return `npm:${item.source.npm}`;

	const settingsDirectory = path.join(options.targetProjectDir, ".pi");
	const absolutePackagePath = path.resolve(options.repoRoot, item.source.path);
	const relativePath = path
		.relative(settingsDirectory, absolutePackagePath)
		.split(path.sep)
		.join("/");
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

export function buildInstallPlan(selectedIds, manifest, options) {
	const packageMap = new Map(manifest.packages.map((item) => [item.id, item]));
	const ids = expandRequirements(selectedIds, packageMap);
	const items = ids.map((id) => packageMap.get(id));

	return {
		ids,
		items,
		packageSources: items.map((item) => sourceFor(item, options)),
	};
}
