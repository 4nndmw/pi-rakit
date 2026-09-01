#!/usr/bin/env node
import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "LICENSE");
const workspacePaths = [
	"apps/installer",
	"packages/hello-pi",
	"packages/custom-provider",
	"packages/doctor",
	"packages/worktree",
	"packages/git",
	"packages/biome",
];
const checkOnly = process.argv.includes("--check");
const source = readFileSync(sourcePath);

if (checkOnly) {
	const mismatches = workspacePaths.filter((workspace) => {
		try {
			return !source.equals(
				readFileSync(path.join(root, workspace, "LICENSE")),
			);
		} catch {
			return true;
		}
	});
	if (mismatches.length > 0) {
		console.error(
			`Workspace licenses are missing or out of sync: ${mismatches.join(", ")}. Run npm run license:sync.`,
		);
		process.exit(1);
	}
	console.log("Workspace licenses are in sync.");
} else {
	for (const workspace of workspacePaths) {
		copyFileSync(sourcePath, path.join(root, workspace, "LICENSE"));
	}
	console.log(`Synced LICENSE to ${workspacePaths.length} public workspaces.`);
}
