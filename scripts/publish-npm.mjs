#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLISH_WORKSPACES = [
	"packages/hello-pi",
	"packages/custom-provider",
	"packages/doctor",
	"packages/worktree",
	"packages/git",
	"packages/biome",
	"packages/token-speed",
	"packages/session-usage",
	"packages/session-stats",
	"packages/session-delete",
	"packages/compact-tools",
	"packages/auto-title",
	"packages/onboarding",
	"packages/plan-mode",
	"packages/ui",
	"packages/playwright-browser",
	"apps/installer",
];
const dryRun = process.argv.includes("--dry-run");
const provenance = process.argv.includes("--provenance");
const workspaceIndex = process.argv.indexOf("--workspace");
const workspaceValue = workspaceIndex === -1 ? undefined : process.argv[workspaceIndex + 1];
if (workspaceIndex !== -1 && (!workspaceValue || workspaceValue.startsWith("-"))) {
	console.error("--workspace requires a public workspace path");
	process.exit(1);
}
const requestedWorkspace = workspaceValue;
if (requestedWorkspace && !PUBLISH_WORKSPACES.includes(requestedWorkspace)) {
	console.error(`Unknown public workspace: ${requestedWorkspace}`);
	process.exit(1);
}
const workspaces = requestedWorkspace ? [requestedWorkspace] : PUBLISH_WORKSPACES;

function run(command, args, cwd = root) {
	const result = spawnSync(command, args, {
		cwd,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (result.status !== 0) process.exit(result.status ?? 1);
}

function isPublished(workspace) {
	const workspaceRoot = path.join(root, workspace);
	const manifest = JSON.parse(readFileSync(path.join(workspaceRoot, "package.json"), "utf8"));
	const spec = `${manifest.name}@${manifest.version}`;
	const result = spawnSync("npm", ["view", spec, "version", "--json"], {
		cwd: workspaceRoot,
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	if (result.status === 0) return { published: true, spec };
	if (/\bE404\b|Not Found/i.test(`${result.stdout}\n${result.stderr}`)) return { published: false, spec };
	process.stderr.write(result.stderr || result.stdout || `Unable to check ${spec}\n`);
	process.exit(result.status ?? 1);
}

run(process.execPath, [
	path.join(root, "scripts", "sync-installer-manifest.mjs"),
]);
run("npm", ["test"]);

for (const workspace of workspaces) {
	const { published, spec } = isPublished(workspace);
	if (published) {
		console.log(`\nSkipping ${spec} (already published)`);
		continue;
	}
	console.log(`\nPublishing ${spec}${dryRun ? " (dry run)" : ""}`);
	const args = ["publish", "--access", "public"];
	if (provenance) args.push("--provenance");
	if (dryRun) args.push("--dry-run");
	run("npm", args, path.join(root, workspace));
}
