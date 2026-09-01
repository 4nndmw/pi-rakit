#!/usr/bin/env node
import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "manifest.json");
const outputPath = path.join(root, "apps", "installer", "manifest.json");
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
	const source = readFileSync(sourcePath);
	const output = readFileSync(outputPath);
	if (!source.equals(output)) {
		console.error(
			"apps/installer/manifest.json is out of sync. Run npm run manifest:sync.",
		);
		process.exit(1);
	}
	console.log("Installer manifest is in sync.");
} else {
	copyFileSync(sourcePath, outputPath);
	console.log(`Synced ${path.relative(root, outputPath)}`);
}
