import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const installerRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const cliPath = path.join(installerRoot, "src", "cli.js");

const expectedSources = [
	"npm:pi-rakit-hello",
	"npm:pi-rakit-custom-provider",
	"npm:pi-rakit-doctor",
	"npm:pi-rakit-worktree",
	"npm:pi-rakit-git",
	"npm:@dietrichgebert/ponytail@4.9.0",
	"npm:caveman-pi@1.0.0",
	"npm:pi-mcp-adapter",
];

test("CLI writes every selected package to isolated local settings", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const homeDirectory = path.join(temporaryRoot, "home");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");

	try {
		mkdirSync(path.dirname(settingsPath), { recursive: true });
		mkdirSync(homeDirectory);
		writeFileSync(
			settingsPath,
			`${JSON.stringify({ theme: "dark", packages: ["npm:existing"] }, null, 2)}\n`,
		);

		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--select-all",
				"--yes",
				"--write-only",
			],
			{
				cwd: installerRoot,
				encoding: "utf8",
				env: {
					...process.env,
					HOME: homeDirectory,
					USERPROFILE: homeDirectory,
				},
			},
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		assert.match(result.stdout, /Updated local settings:/);

		const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
		assert.equal(settings.theme, "dark");
		assert.deepEqual(settings.packages, ["npm:existing", ...expectedSources]);
		for (const source of expectedSources) {
			assert.equal(
				settings.packages.filter((candidate) => candidate === source).length,
				1,
				`${source} must be written exactly once`,
			);
		}
		assert.equal(existsSync(path.join(homeDirectory, ".pi")), false);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});
