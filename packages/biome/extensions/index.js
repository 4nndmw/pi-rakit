import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MAX_OUTPUT_LENGTH = 12000;

function biomeExecutable() {
	return require.resolve("@biomejs/biome/bin/biome");
}

function defaultRunBiome(args, cwd) {
	return spawnSync(biomeExecutable(), args, {
		cwd,
		encoding: "utf8",
		shell: false,
	});
}

function usage() {
	return "Usage: /biome check|lint|format [path ...]";
}

export function parseBiomeCommand(input) {
	const [action, ...targets] = input.trim().split(/\s+/).filter(Boolean);
	if (!action || !["check", "lint", "format"].includes(action)) {
		throw new Error(usage());
	}
	if (targets.some((target) => target.startsWith("-"))) {
		throw new Error("Biome targets cannot start with a hyphen.");
	}
	return { action, targets };
}

function formatOutput(result) {
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
	if (!output)
		return result.status === 0
			? "Biome completed successfully."
			: "Biome failed without output.";
	if (output.length <= MAX_OUTPUT_LENGTH) return output;
	return `${output.slice(0, MAX_OUTPUT_LENGTH)}\n… output truncated`;
}

export function runBiome(action, targets = [], options = {}) {
	const cwd = options.cwd ?? process.cwd();
	const run = options.runBiome ?? defaultRunBiome;
	const command = action === "format" ? "format" : action;
	const args = [command];
	if (action === "format") args.push("--write");
	args.push(...(targets.length > 0 ? targets : ["."]));

	const result = run(args, cwd);
	if (result.error) throw result.error;
	return {
		args,
		cwd,
		status: result.status ?? 1,
		output: formatOutput(result),
	};
}

export default function biomeExtension(pi) {
	pi.registerCommand("biome", {
		description: "Run Biome checks, linting, or confirmed formatting",
		handler: async (args, ctx) => {
			try {
				const { action, targets } = parseBiomeCommand(args);
				if (action === "format") {
					const targetLabel =
						targets.length > 0 ? targets.join(", ") : "the current project";
					const choice = await ctx.ui.select(
						`Format ${targetLabel} with Biome? This writes files.`,
						["Cancel", "Format"],
					);
					if (choice !== "Format") {
						ctx.ui.notify("Cancelled.", "info");
						return;
					}
				}

				const result = runBiome(action, targets);
				ctx.ui.notify(result.output, result.status === 0 ? "info" : "error");
			} catch (error) {
				ctx.ui.notify(
					error instanceof Error ? error.message : String(error),
					"error",
				);
			}
		},
	});
}
