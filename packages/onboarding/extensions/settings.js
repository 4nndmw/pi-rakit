import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const ONBOARDING_PACKAGE_ID = "onboarding";

export function packageSource(item) {
	if (item.source.mode === "workspace") return `npm:${item.source.npm}`;
	const version = item.source.version ? `@${item.source.version}` : "";
	return `npm:${item.source.name}${version}`;
}

function entrySource(entry) {
	if (typeof entry === "string") return entry;
	return entry && typeof entry === "object" && typeof entry.source === "string"
		? entry.source
		: null;
}

function npmPackageName(source) {
	if (!source.startsWith("npm:")) return null;
	const specifier = source.slice(4);
	if (specifier.startsWith("@")) {
		const versionSeparator = specifier.indexOf("@", specifier.indexOf("/") + 1);
		return versionSeparator === -1
			? specifier
			: specifier.slice(0, versionSeparator);
	}
	const versionSeparator = specifier.indexOf("@");
	return versionSeparator === -1
		? specifier
		: specifier.slice(0, versionSeparator);
}

export function packageIdForEntry(entry, manifest) {
	const source = entrySource(entry);
	if (!source) return null;
	const npmName = npmPackageName(source);
	const normalized = source.replaceAll("\\", "/").replace(/\/$/, "");

	for (const item of manifest.packages) {
		const expectedName =
			item.source.mode === "workspace" ? item.source.npm : item.source.name;
		if (npmName && npmName === expectedName) return item.id;
		if (item.source.mode === "workspace") {
			const workspacePath = item.source.path.replaceAll("\\", "/");
			if (
				normalized === workspacePath ||
				normalized.endsWith(`/${workspacePath}`)
			)
				return item.id;
		}
	}
	return null;
}

export function selectedPackageIds(settings, manifest) {
	const selected = new Set();
	for (const entry of Array.isArray(settings.packages) ? settings.packages : []) {
		const id = packageIdForEntry(entry, manifest);
		if (id) selected.add(id);
	}
	return [...selected];
}

export function reconcilePackages(settings, manifest, selectedIds) {
	const selected = new Set(selectedIds);
	for (const item of manifest.packages) {
		if (item.alwaysInstall) selected.add(item.id);
	}

	const existing = Array.isArray(settings.packages) ? settings.packages : [];
	const existingById = new Map();
	const unmanaged = [];
	for (const entry of existing) {
		const id = packageIdForEntry(entry, manifest);
		if (!id) unmanaged.push(entry);
		else if (!existingById.has(id)) existingById.set(id, entry);
	}

	const managed = manifest.packages
		.filter((item) => selected.has(item.id))
		.map((item) => {
			const source = packageSource(item);
			const existingEntry = existingById.get(item.id);
			return existingEntry && typeof existingEntry === "object"
				? { ...existingEntry, source }
				: source;
		});

	return { ...settings, packages: [...unmanaged, ...managed] };
}

export function getSettingsPath(scope, cwd, home = homedir()) {
	return scope === "global"
		? path.join(home, ".pi", "agent", "settings.json")
		: path.join(cwd, ".pi", "settings.json");
}

export function readSettings(settingsPath) {
	if (!existsSync(settingsPath)) return {};
	try {
		const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
		if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
			throw new Error("settings must be a JSON object");
		}
		return settings;
	} catch (error) {
		throw new Error(`Invalid settings JSON at ${settingsPath}: ${error.message}`);
	}
}

export function writeSettings(settingsPath, settings) {
	mkdirSync(path.dirname(settingsPath), { recursive: true });
	const temporaryPath = `${settingsPath}.${process.pid}.${Date.now()}.tmp`;
	writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
		mode: 0o600,
	});
	renameSync(temporaryPath, settingsPath);
}
