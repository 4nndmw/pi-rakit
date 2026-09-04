#!/usr/bin/env node
import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "manifest.json");
const outputPaths = [
	path.join(root, "apps", "installer", "manifest.json"),
	path.join(root, "packages", "onboarding", "manifest.json"),
];
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
	const source = readFileSync(sourcePath);
	const mismatches = outputPaths.filter((outputPath) => {
		try {
			return !source.equals(readFileSync(outputPath));
		} catch {
			return true;
		}
	});
	if (mismatches.length > 0) {
		console.error(
			`Manifest copies are out of sync: ${mismatches
				.map((outputPath) => path.relative(root, outputPath))
				.join(", ")}. Run npm run manifest:sync.`,
		);
		process.exit(1);
	}
	console.log("Installer and onboarding manifests are in sync.");
} else {
	for (const outputPath of outputPaths) {
		copyFileSync(sourcePath, outputPath);
		console.log(`Synced ${path.relative(root, outputPath)}`);
	}
}
