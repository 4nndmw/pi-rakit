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
	"npm:pi-rakit-biome",
	"npm:@dietrichgebert/ponytail@4.9.0",
	"npm:caveman-pi@1.0.0",
	"npm:pi-mcp-adapter",
];

test("CLI prints its package version without loading a manifest", () => {
	const missingManifest = path.join(
		tmpdir(),
		`pi-rakit-missing-manifest-${Date.now()}.json`,
	);
	const result = spawnSync(
		process.execPath,
		[cliPath, "--manifest", missingManifest, "--version"],
		{ cwd: installerRoot, encoding: "utf8" },
	);

	assert.equal(
		result.status,
		0,
		`CLI failed:\n${result.stdout}${result.stderr}`,
	);
	const packageJson = JSON.parse(
		readFileSync(path.join(installerRoot, "package.json"), "utf8"),
	);
	assert.equal(result.stdout, `${packageJson.version}\n`);
	assert.equal(result.stderr, "");
});

test("CLI lists package ids without requiring a target directory", () => {
	const missingDirectory = path.join(
		tmpdir(),
		`pi-rakit-missing-${Date.now()}`,
	);
	const result = spawnSync(
		process.execPath,
		[cliPath, "--cwd", missingDirectory, "--list-packages"],
		{ cwd: installerRoot, encoding: "utf8" },
	);

	assert.equal(
		result.status,
		0,
		`CLI failed:\n${result.stdout}${result.stderr}`,
	);
	assert.match(result.stdout, /^hello-pi\tHello Pi\tnpm:pi-rakit-hello$/m);
	assert.match(
		result.stdout,
		/^ponytail\tPonytail\tnpm:@dietrichgebert\/ponytail@4\.9\.0$/m,
	);
	assert.match(result.stdout, /^caveman\tCaveman\tnpm:caveman-pi@1\.0\.0$/m);
	assert.equal(existsSync(missingDirectory), false);
});

test("CLI lists packages as machine-readable JSON", () => {
	const result = spawnSync(
		process.execPath,
		[cliPath, "--list-packages", "--json"],
		{ cwd: installerRoot, encoding: "utf8" },
	);

	assert.equal(
		result.status,
		0,
		`CLI failed:\n${result.stdout}${result.stderr}`,
	);
	const packages = JSON.parse(result.stdout);
	assert.deepEqual(
		packages.find((item) => item.id === "ponytail"),
		{
			id: "ponytail",
			label: "Ponytail",
			source: "npm:@dietrichgebert/ponytail@4.9.0",
		},
	);
	assert.equal(
		packages.some((item) => item.hidden),
		false,
	);
});

test("CLI writes JSON package listing to an output file", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const outputPath = path.join(temporaryRoot, "reports", "packages.json");

	try {
		const result = spawnSync(
			process.execPath,
			[cliPath, "--list-packages", "--json", "--output", outputPath],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		assert.equal(result.stdout, "");
		assert.equal(result.stderr, "");
		const packages = JSON.parse(readFileSync(outputPath, "utf8"));
		assert.equal(
			packages.find((item) => item.id === "caveman").source,
			"npm:caveman-pi@1.0.0",
		);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI dry-run previews only new sources without writing settings", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");
	const originalSettings = `${JSON.stringify(
		{
			theme: "dark",
			packages: ["npm:@dietrichgebert/ponytail@4.9.0"],
		},
		null,
		2,
	)}\n`;

	try {
		mkdirSync(path.dirname(settingsPath), { recursive: true });
		writeFileSync(settingsPath, originalSettings);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"ponytail",
				"--package",
				"caveman",
				"--dry-run",
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		assert.match(result.stdout, /Would update local settings:/);
		assert.doesNotMatch(result.stdout, /\+ npm:@dietrichgebert\/ponytail/);
		assert.match(result.stdout, /\+ npm:caveman-pi@1\.0\.0/);
		assert.equal(readFileSync(settingsPath, "utf8"), originalSettings);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI dry-run emits machine-readable JSON without writing settings", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");

	try {
		mkdirSync(projectDirectory);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"ponytail",
				"--package",
				"caveman",
				"--dry-run",
				"--json",
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		assert.deepEqual(JSON.parse(result.stdout), {
			scope: "local",
			settingsPath,
			packageSources: [
				"npm:@dietrichgebert/ponytail@4.9.0",
				"npm:caveman-pi@1.0.0",
			],
			addedSources: [
				"npm:@dietrichgebert/ponytail@4.9.0",
				"npm:caveman-pi@1.0.0",
			],
		});
		assert.equal(result.stderr, "");
		assert.equal(existsSync(settingsPath), false);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI check reports missing sources without writing settings", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");

	try {
		mkdirSync(projectDirectory);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"caveman",
				"--check",
				"--json",
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(result.status, 1);
		assert.deepEqual(JSON.parse(result.stdout), {
			scope: "local",
			settingsPath,
			packageSources: ["npm:caveman-pi@1.0.0"],
			addedSources: ["npm:caveman-pi@1.0.0"],
		});
		assert.equal(result.stderr, "");
		assert.equal(existsSync(settingsPath), false);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI check preserves its exit status when writing JSON output", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");
	const outputPath = path.join(temporaryRoot, "reports", "check.json");

	try {
		mkdirSync(projectDirectory);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"caveman",
				"--check",
				"--json",
				"--output",
				outputPath,
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(result.status, 1);
		assert.equal(result.stdout, "");
		assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), {
			scope: "local",
			settingsPath,
			packageSources: ["npm:caveman-pi@1.0.0"],
			addedSources: ["npm:caveman-pi@1.0.0"],
		});
		assert.equal(existsSync(settingsPath), false);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI check succeeds when selected sources are configured", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");

	try {
		mkdirSync(path.dirname(settingsPath), { recursive: true });
		writeFileSync(
			settingsPath,
			`${JSON.stringify({ packages: ["npm:caveman-pi@1.0.0"] }, null, 2)}\n`,
		);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"caveman",
				"--check",
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		assert.match(result.stdout, /No package changes/);
		assert.deepEqual(JSON.parse(readFileSync(settingsPath, "utf8")), {
			packages: ["npm:caveman-pi@1.0.0"],
		});
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI dry-run does not create a settings file", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");
	const settingsPath = path.join(projectDirectory, ".pi", "settings.json");

	try {
		mkdirSync(projectDirectory);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"caveman",
				"--dry-run",
				"--install",
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		assert.match(result.stdout, /\+ npm:caveman-pi@1\.0\.0/);
		assert.equal(existsSync(settingsPath), false);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

test("CLI selects specific packages without an interactive prompt", () => {
	const temporaryRoot = mkdtempSync(path.join(tmpdir(), "pi-rakit-e2e-"));
	const projectDirectory = path.join(temporaryRoot, "project");

	try {
		mkdirSync(projectDirectory);
		const result = spawnSync(
			process.execPath,
			[
				cliPath,
				"--cwd",
				projectDirectory,
				"--local",
				"--package",
				"ponytail",
				"--package",
				"caveman",
				"--yes",
				"--write-only",
			],
			{ cwd: installerRoot, encoding: "utf8" },
		);

		assert.equal(
			result.status,
			0,
			`CLI failed:\n${result.stdout}${result.stderr}`,
		);
		const settings = JSON.parse(
			readFileSync(path.join(projectDirectory, ".pi", "settings.json"), "utf8"),
		);
		assert.deepEqual(settings.packages, [
			"npm:@dietrichgebert/ponytail@4.9.0",
			"npm:caveman-pi@1.0.0",
		]);
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
});

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
