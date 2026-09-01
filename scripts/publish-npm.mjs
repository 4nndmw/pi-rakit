#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLISH_WORKSPACES = ["packages/hello-pi", "apps/installer"];
const dryRun = process.argv.includes("--dry-run");

function run(command, args, cwd = root) {
	const result = spawnSync(command, args, {
		cwd,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [
	path.join(root, "scripts", "sync-installer-manifest.mjs"),
]);
run("npm", ["test"]);

for (const workspace of PUBLISH_WORKSPACES) {
	console.log(`\nPublishing ${workspace}${dryRun ? " (dry run)" : ""}`);
	const args = ["publish", "--access", "public"];
	if (dryRun) args.push("--dry-run");
	run("npm", args, path.join(root, workspace));
}
