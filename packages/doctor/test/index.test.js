import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
	formatDiagnostics,
	inspectSettings,
	runDiagnostics,
} from "../extensions/index.js";

test("reports duplicate packages and missing environment variables", () => {
	const checks = inspectSettings(
		{
			packages: ["npm:example", "npm:example"],
			providers: { example: { apiKey: "$EXAMPLE_API_KEY" } },
		},
		"settings.json",
		{},
	);

	assert.deepEqual(
		checks.map((check) => check.status),
		["warn", "warn"],
	);
	assert.match(checks[0].message, /npm:example/);
	assert.match(checks[1].message, /EXAMPLE_API_KEY/);
});

test("diagnoses runtime and valid project settings", () => {
	const root = mkdtempSync(path.join(tmpdir(), "pi-rakit-doctor-"));
	const settingsDirectory = path.join(root, ".pi");
	mkdirSync(settingsDirectory);
	writeFileSync(
		path.join(settingsDirectory, "settings.json"),
		JSON.stringify({ packages: ["npm:example"] }),
	);

	const checks = runDiagnostics({
		cwd: root,
		homeDirectory: path.join(root, "home"),
		env: {},
		nodeVersion: "20.18.0",
		runPi: () => ({ status: 0, stdout: "pi 1.2.3\n" }),
	});

	assert.equal(
		checks.some((check) => check.status === "fail"),
		false,
	);
	assert.equal(checks.filter((check) => check.status === "pass").length, 5);
	assert.match(formatDiagnostics(checks), /Summary: 5 passed/);
});

test("reports invalid settings and unavailable runtimes", () => {
	const root = mkdtempSync(path.join(tmpdir(), "pi-rakit-doctor-"));
	const settingsDirectory = path.join(root, ".pi");
	mkdirSync(settingsDirectory);
	writeFileSync(path.join(settingsDirectory, "settings.json"), "{");

	const checks = runDiagnostics({
		cwd: root,
		homeDirectory: path.join(root, "home"),
		nodeVersion: "18.0.0",
		runPi: () => ({ status: 1, error: new Error("not found") }),
	});

	assert.equal(checks.filter((check) => check.status === "fail").length, 3);
});

test("reports a non-object settings root", () => {
	const root = mkdtempSync(path.join(tmpdir(), "pi-rakit-doctor-"));
	const settingsDirectory = path.join(root, ".pi");
	mkdirSync(settingsDirectory);
	writeFileSync(path.join(settingsDirectory, "settings.json"), "null");

	const checks = runDiagnostics({
		cwd: root,
		homeDirectory: path.join(root, "home"),
		nodeVersion: "20.18.0",
		runPi: () => ({ status: 0, stdout: "pi 1.2.3\n" }),
	});

	assert.equal(checks.filter((check) => check.status === "fail").length, 1);
	assert.match(checks.at(-1).message, /root must be an object/);
});

test("registers the doctor command", async () => {
	let command;
	const pi = {
		registerCommand(name, definition) {
			command = { name, definition };
		},
	};
	const { default: registerDoctor } = await import("../extensions/index.js");
	registerDoctor(pi);

	assert.equal(command.name, "doctor");
	assert.match(command.definition.description, /settings/);
});
