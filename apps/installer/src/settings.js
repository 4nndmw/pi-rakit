import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export function getSettingsPath({ cwd, global = true }) {
	return global
		? path.join(homedir(), ".pi", "agent", "settings.json")
		: path.join(cwd, ".pi", "settings.json");
}

export function readSettings(options) {
	const settingsPath = getSettingsPath(options);
	if (!existsSync(settingsPath)) return {};

	try {
		return JSON.parse(readFileSync(settingsPath, "utf8"));
	} catch (error) {
		throw new Error(
			`Invalid settings JSON at ${settingsPath}: ${error.message}`,
		);
	}
}

export function mergePackageSources(settings, packageSources) {
	const existing = Array.isArray(settings.packages) ? settings.packages : [];
	return {
		...settings,
		packages: [...new Set([...existing, ...packageSources])],
	};
}

export function writeSettings(settings, options) {
	const settingsPath = getSettingsPath(options);
	mkdirSync(path.dirname(settingsPath), { recursive: true });
	writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
	return settingsPath;
}
