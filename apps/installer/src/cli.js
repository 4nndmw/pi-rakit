#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildInstallPlan } from "./install-plan.js";
import { getDefaultPackageIds, loadManifest } from "./manifest.js";
import { promptForConfirmation, promptForPackageIds } from "./prompts.js";
import {
	getSettingsPath,
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
  --dry-run          Preview settings changes without writing
  --check            Exit nonzero when selected packages are missing
  --package <id>     Select a package by manifest id (repeatable)
  --list-packages    List visible package ids and exit
  --json             Output listing, dry-run, or check as JSON
  --output <path>    Write JSON output to a file
  --select-all       Select all visible packages
  --yes, -y          Skip confirmation
  --version, -v      Show the installed version
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
		dryRun: false,
		check: false,
		packageIds: [],
		listPackages: false,
		json: false,
		output: null,
		selectAll: false,
		yes: false,
		version: false,
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
		else if (token === "--dry-run") options.dryRun = true;
		else if (token === "--check") options.check = true;
		else if (token === "--package") {
			options.packageIds.push(nextValue(index, token));
			index += 1;
		} else if (token === "--list-packages") options.listPackages = true;
		else if (token === "--json") options.json = true;
		else if (token === "--output") {
			options.output = path.resolve(nextValue(index, token));
			index += 1;
		} else if (token === "--select-all") options.selectAll = true;
		else if (token === "--yes" || token === "-y") options.yes = true;
		else if (token === "--version" || token === "-v") options.version = true;
		else if (token === "--help" || token === "-h") options.help = true;
		else throw new Error(`Unknown option: ${token}`);
	}

	if (options.selectAll && options.packageIds.length > 0) {
		throw new Error("--package cannot be combined with --select-all.");
	}
	if (
		options.listPackages &&
		(options.selectAll || options.packageIds.length > 0)
	) {
		throw new Error(
			"--list-packages cannot be combined with package selection options.",
		);
	}
	if (options.dryRun && options.check) {
		throw new Error("--dry-run cannot be combined with --check.");
	}
	if (
		options.json &&
		!options.listPackages &&
		!options.dryRun &&
		!options.check
	) {
		throw new Error("--json requires --list-packages, --dry-run, or --check.");
	}
	if (options.output && !options.json) {
		throw new Error("--output requires --json.");
	}

	return options;
}

function formatPackageSource(item) {
	if (item.source.mode === "workspace") return `npm:${item.source.npm}`;
	const version = item.source.version ? `@${item.source.version}` : "";
	return `npm:${item.source.name}${version}`;
}

export function formatPackageList(manifest, options = {}) {
	const packages = manifest.packages
		.filter((item) => !item.hidden)
		.map((item) => ({
			id: item.id,
			label: item.label,
			source: formatPackageSource(item),
		}));

	if (options.json) return JSON.stringify(packages, null, 2);
	return packages
		.map((item) => `${item.id}\t${item.label}\t${item.source}`)
		.join("\n");
}

function emitOutput(content, outputPath) {
	if (!outputPath) {
		console.log(content);
		return;
	}
	mkdirSync(path.dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, `${content}\n`);
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
	const packageRoot = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		"..",
	);
	if (options.version) {
		const packageJson = JSON.parse(
			readFileSync(path.join(packageRoot, "package.json"), "utf8"),
		);
		console.log(packageJson.version);
		return;
	}
	const repoRoot = path.resolve(packageRoot, "../..");
	const manifestPath =
		options.manifest ?? path.join(packageRoot, "manifest.json");
	const manifest = loadManifest(manifestPath, {
		validateWorkspacePaths:
			!options.listPackages && (options.dev || Boolean(options.manifest)),
		workspaceRoot: repoRoot,
	});

	if (options.listPackages) {
		emitOutput(
			formatPackageList(manifest, { json: options.json }),
			options.output,
		);
		return;
	}
	if (!existsSync(options.cwd)) {
		throw new Error(`Target directory does not exist: ${options.cwd}`);
	}

	const visiblePackages = manifest.packages.filter((item) => !item.hidden);
	const selectedIds = options.selectAll
		? visiblePackages.map((item) => item.id)
		: options.packageIds.length > 0
			? [...new Set(options.packageIds)]
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

	const settings = readSettings(options);
	if (options.dryRun || options.check) {
		const existingSources = new Set(
			Array.isArray(settings.packages) ? settings.packages : [],
		);
		const addedSources = plan.packageSources.filter(
			(source) => !existingSources.has(source),
		);
		const preview = {
			scope: options.global ? "global" : "local",
			settingsPath: getSettingsPath(options),
			packageSources: plan.packageSources,
			addedSources,
		};
		if (options.json) {
			emitOutput(JSON.stringify(preview, null, 2), options.output);
		} else {
			console.log(
				`Would update ${preview.scope} settings: ${preview.settingsPath}`,
			);
			if (preview.addedSources.length === 0)
				console.log("  No package changes.");
			else
				for (const source of preview.addedSources) console.log(`  + ${source}`);
		}
		if (options.check && preview.addedSources.length > 0) process.exitCode = 1;
		return;
	}

	if (!options.yes && !(await promptForConfirmation(plan, options.cwd))) {
		console.log("Cancelled.");
		return;
	}

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
