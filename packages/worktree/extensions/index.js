import { spawnSync } from "node:child_process";
import path from "node:path";

const PROTECTED_BRANCHES = new Set(["main", "master"]);
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

function defaultRunGit(args, cwd) {
	return spawnSync("git", args, {
		cwd,
		encoding: "utf8",
		shell: process.platform === "win32",
	});
}

function git(runGit, args, cwd, options = {}) {
	const result = runGit(args, cwd);
	if (result.error) throw result.error;
	if (result.status !== 0 && !options.allowFailure) {
		const message = String(result.stderr || result.stdout || "Git command failed").trim();
		throw new Error(message);
	}
	return result;
}

function validateName(name) {
	if (!name || !NAME_PATTERN.test(name) || name === "." || name === "..") {
		throw new Error("Name must use letters, numbers, dots, underscores, or hyphens.");
	}
	if (PROTECTED_BRANCHES.has(name.toLowerCase())) {
		throw new Error(`Protected branch name: ${name}`);
	}
	return name;
}

export function parseWorktrees(output) {
	const worktrees = [];
	let current = null;
	for (const line of output.split("\n")) {
		if (line.startsWith("worktree ")) {
			current = { path: line.slice(9), branch: null, bare: false };
			worktrees.push(current);
		} else if (current && line.startsWith("branch refs/heads/")) {
			current.branch = line.slice("branch refs/heads/".length);
		} else if (current && line === "bare") {
			current.bare = true;
		}
	}
	return worktrees;
}

function repositoryRoot(runGit, cwd) {
	return git(runGit, ["rev-parse", "--show-toplevel"], cwd).stdout.trim();
}

function ensureClean(runGit, cwd, label) {
	const status = git(runGit, ["status", "--porcelain"], cwd).stdout.trim();
	if (status) throw new Error(`${label} has uncommitted changes.`);
}

export function listWorktrees(options = {}) {
	const cwd = options.cwd ?? process.cwd();
	const runGit = options.runGit ?? defaultRunGit;
	const root = repositoryRoot(runGit, cwd);
	const output = git(runGit, ["worktree", "list", "--porcelain"], root).stdout;
	return parseWorktrees(output);
}

export function createWorktree(name, options = {}) {
	validateName(name);
	const cwd = options.cwd ?? process.cwd();
	const runGit = options.runGit ?? defaultRunGit;
	const root = repositoryRoot(runGit, cwd);
	ensureClean(runGit, root, "Current worktree");

	const branch = `worktree/${name}`;
	const target = path.join(path.dirname(root), `${path.basename(root)}-${name}`);
	const branchCheck = git(
		runGit,
		["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
		root,
		{ allowFailure: true },
	);
	if (branchCheck.status === 0) throw new Error(`Branch already exists: ${branch}`);

	git(runGit, ["worktree", "add", "-b", branch, target], root);
	return { name, branch, path: target };
}

export function removeWorktree(name, options = {}) {
	validateName(name);
	const cwd = options.cwd ?? process.cwd();
	const runGit = options.runGit ?? defaultRunGit;
	const root = repositoryRoot(runGit, cwd);
	const branch = `worktree/${name}`;
	const target = listWorktrees({ cwd: root, runGit }).find(
		(item) => item.branch === branch,
	);
	if (!target) throw new Error(`Worktree not found for branch ${branch}.`);
	if (path.resolve(target.path) === path.resolve(root)) {
		throw new Error("Cannot remove the current worktree.");
	}
	if (PROTECTED_BRANCHES.has(target.branch?.toLowerCase())) {
		throw new Error(`Cannot remove protected branch ${target.branch}.`);
	}

	ensureClean(runGit, target.path, "Target worktree");
	git(runGit, ["worktree", "remove", target.path], root);
	return target;
}

export function formatWorktrees(worktrees) {
	if (worktrees.length === 0) return "No Git worktrees found.";
	return worktrees
		.map((item) => `${item.branch ?? "detached"}\n  ${item.path}`)
		.join("\n");
}

function usage() {
	return "Usage: /worktree list | create <name> | remove <name>";
}

export default function worktreeExtension(pi) {
	pi.registerCommand("worktree", {
		description: "List, create, or safely remove Git worktrees",
		handler: async (args, ctx) => {
			try {
				const [action, name, ...extra] = args.trim().split(/\s+/).filter(Boolean);
				if (!action || extra.length > 0) {
					ctx.ui.notify(usage(), "info");
					return;
				}

				if (action === "list") {
					if (name) throw new Error(usage());
					ctx.ui.notify(formatWorktrees(listWorktrees()), "info");
					return;
				}

				if (action === "create") {
					if (!name) throw new Error(usage());
					const created = createWorktree(name);
					ctx.ui.notify(
						`Created ${created.branch}\n${created.path}`,
						"info",
					);
					return;
				}

				if (action === "remove") {
					if (!name) throw new Error(usage());
					validateName(name);
					const choice = await ctx.ui.select(
						`Remove worktree/${name}? The branch will be preserved.`,
						["Cancel", "Remove"],
					);
					if (choice !== "Remove") {
						ctx.ui.notify("Cancelled.", "info");
						return;
					}
					const removed = removeWorktree(name);
					ctx.ui.notify(`Removed worktree at ${removed.path}`, "info");
					return;
				}

				throw new Error(usage());
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
