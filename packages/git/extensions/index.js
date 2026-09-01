import { spawnSync } from "node:child_process";

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

function repositoryRoot(runGit, cwd) {
	return git(runGit, ["rev-parse", "--show-toplevel"], cwd).stdout.trim();
}

export function gitStatus(options = {}) {
	const cwd = options.cwd ?? process.cwd();
	const runGit = options.runGit ?? defaultRunGit;
	const root = repositoryRoot(runGit, cwd);
	const output = git(runGit, ["status", "--short", "--branch"], root).stdout.trim();
	return output || "Working tree clean.";
}

export function currentBranch(options = {}) {
	const cwd = options.cwd ?? process.cwd();
	const runGit = options.runGit ?? defaultRunGit;
	const root = repositoryRoot(runGit, cwd);
	const branch = git(
		runGit,
		["symbolic-ref", "--quiet", "--short", "HEAD"],
		root,
		{ allowFailure: true },
	);
	if (branch.status === 0) return branch.stdout.trim();
	const commit = git(runGit, ["rev-parse", "--short", "HEAD"], root).stdout.trim();
	return `detached at ${commit}`;
}

export function commitStaged(message, options = {}) {
	const trimmedMessage = message?.trim();
	if (!trimmedMessage) throw new Error("Commit message is required.");

	const cwd = options.cwd ?? process.cwd();
	const runGit = options.runGit ?? defaultRunGit;
	const root = repositoryRoot(runGit, cwd);
	const staged = git(runGit, ["diff", "--cached", "--quiet"], root, {
		allowFailure: true,
	});
	if (staged.status === 0) throw new Error("No staged changes to commit.");
	if (staged.status !== 1) {
		const detail = String(staged.stderr || staged.stdout || "Unable to inspect staged changes").trim();
		throw new Error(detail);
	}

	git(runGit, ["commit", "-m", trimmedMessage], root);
	return trimmedMessage;
}

function usage() {
	return "Usage: /git status | branch | commit <message>";
}

export default function gitExtension(pi) {
	pi.registerCommand("git", {
		description: "Inspect Git state or commit already-staged changes",
		handler: async (args, ctx) => {
			try {
				const input = args.trim();
				const [action, ...rest] = input.split(/\s+/).filter(Boolean);
				if (!action) throw new Error(usage());

				if (action === "status" && rest.length === 0) {
					ctx.ui.notify(gitStatus(), "info");
					return;
				}
				if (action === "branch" && rest.length === 0) {
					ctx.ui.notify(currentBranch(), "info");
					return;
				}
				if (action === "commit" && rest.length > 0) {
					const message = rest.join(" ");
					const choice = await ctx.ui.select(
						`Commit staged changes with message “${message}”?`,
						["Cancel", "Commit"],
					);
					if (choice !== "Commit") {
						ctx.ui.notify("Cancelled.", "info");
						return;
					}
					commitStaged(message);
					ctx.ui.notify(`Committed staged changes: ${message}`, "info");
					return;
				}
				throw new Error(usage());
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
