#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildInstallPlan } from "./install-plan.js";
import { getDefaultPackageIds, loadManifest } from "./manifest.js";
import { promptForConfirmation, promptForPackageIds } from "./prompts.js";
import {
	mergePackageSources,
	readSettings,
	writeSettings,
} from "./settings.js";

function printHelp() {
	console.log(`Pi Rakit

Usage:
  npx pi-rakit [options]

Options:
  --cwd <path>       Target project directory
  --manifest <path>  Use a custom manifest
  --global           Update ~/.pi/agent/settings.json (default)
  --local            Update <cwd>/.pi/settings.json
  --dev              Use local workspace paths
  --install          Run pi install after updating settings
  --write-only       Do not invoke pi install
  --select-all       Select all visible packages
  --yes, -y          Skip confirmation
  --help, -h         Show this help
`);
}

export function parseArgs(argv) {
	const options = {
		cwd: process.cwd(),
		manifest: null,
		global: true,
		dev: false,
		install: false,
		writeOnly: false,
		selectAll: false,
		yes: false,
	};

	function nextValue(index, option) {
		const value = argv[index + 1];
		if (!value || value.startsWith("-")) {
			throw new Error(`${option} requires a value.`);
		}
		return value;
	}

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--cwd") {
			options.cwd = path.resolve(nextValue(index, token));
			index += 1;
		} else if (token === "--manifest") {
			options.manifest = path.resolve(nextValue(index, token));
			index += 1;
		} else if (token === "--global") options.global = true;
		else if (token === "--local") options.global = false;
		else if (token === "--dev") options.dev = true;
		else if (token === "--install") options.install = true;
		else if (token === "--write-only") options.writeOnly = true;
		else if (token === "--select-all") options.selectAll = true;
		else if (token === "--yes" || token === "-y") options.yes = true;
		else if (token === "--help" || token === "-h") options.help = true;
		else throw new Error(`Unknown option: ${token}`);
	}

	return options;
}

function runPiInstall(cwd, packageSources, global) {
	for (const source of packageSources) {
		const args = ["install", source];
		if (!global) args.push("-l");

		const result = spawnSync("pi", args, {
			cwd,
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		if (result.status !== 0) throw new Error(`pi install failed for ${source}`);
	}
}

export async function main(argv = process.argv.slice(2)) {
	const options = parseArgs(argv);
	if (options.help) {
		printHelp();
		return;
	}
	if (!existsSync(options.cwd)) {
		throw new Error(`Target directory does not exist: ${options.cwd}`);
	}

	const packageRoot = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		"..",
	);
	const repoRoot = path.resolve(packageRoot, "../..");
	const manifestPath =
		options.manifest ?? path.join(packageRoot, "manifest.json");
	const manifest = loadManifest(manifestPath, {
		validateWorkspacePaths: options.dev || Boolean(options.manifest),
		workspaceRoot: repoRoot,
	});

	const visiblePackages = manifest.packages.filter((item) => !item.hidden);
	const selectedIds = options.selectAll
		? visiblePackages.map((item) => item.id)
		: await promptForPackageIds(manifest, getDefaultPackageIds(manifest));

	if (selectedIds.length === 0) {
		console.log("No packages selected.");
		return;
	}

	const plan = buildInstallPlan(selectedIds, manifest, {
		repoRoot,
		targetProjectDir: options.cwd,
		devMode: options.dev,
	});

	if (!options.yes && !(await promptForConfirmation(plan, options.cwd))) {
		console.log("Cancelled.");
		return;
	}

	const settings = readSettings(options);
	const settingsPath = writeSettings(
		mergePackageSources(settings, plan.packageSources),
		options,
	);
	console.log(
		`Updated ${options.global ? "global" : "local"} settings: ${settingsPath}`,
	);
	for (const source of plan.packageSources) console.log(`  + ${source}`);

	if (options.install && !options.writeOnly) {
		runPiInstall(options.cwd, plan.packageSources, options.global);
	}
}

function isMainModule() {
	if (!process.argv[1]) return false;

	try {
		return (
			realpathSync(process.argv[1]) ===
			realpathSync(fileURLToPath(import.meta.url))
		);
	} catch {
		return false;
	}
}

if (isMainModule()) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
