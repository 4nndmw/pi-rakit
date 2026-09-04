import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import onboardingExtension from "../extensions/index.js";

function registerOnboarding() {
	let command;
	onboardingExtension({
		registerCommand(name, definition) {
			command = { name, ...definition };
		},
	});
	return command;
}

const theme = {
	bold(value) {
		return value;
	},
	fg(_color, value) {
		return value;
	},
};

test("registers onboarding and rejects non-interactive modes", async () => {
	const command = registerOnboarding();
	assert.equal(command.name, "onboarding");
	assert.match(command.description, /Pi Rakit/);

	const notifications = [];
	await command.handler("", {
		mode: "print",
		ui: {
			notify(message, level) {
				notifications.push({ message, level });
			},
		},
	});

	assert.deepEqual(notifications, [
		{
			message: "Onboarding requires Pi's interactive TUI.",
			level: "warning",
		},
	]);
});

test("saves project choices through the selector and reloads Pi", async () => {
	const root = mkdtempSync(path.join(tmpdir(), "pi-rakit-onboarding-command-"));
	try {
		const command = registerOnboarding();
		const notifications = [];
		let renderedLines;
		let reloaded = false;

		await command.handler("", {
			mode: "tui",
			cwd: root,
			ui: {
				async select() {
					return "Project settings (.pi/settings.json)";
				},
				custom(factory) {
					return new Promise((resolve) => {
						const component = factory(
							{ requestRender() {} },
							theme,
							{},
							resolve,
						);
						renderedLines = component.render(100);
						component.handleInput("\r");
					});
				},
				async confirm(title, message) {
					assert.equal(title, "Save onboarding choices?");
					assert.match(message, /Scope: project/);
					return true;
				},
				notify(message, level) {
					notifications.push({ message, level });
				},
			},
			async reload() {
				reloaded = true;
			},
		});

		assert.match(renderedLines[0], /Pi Rakit Onboarding/);
		assert.ok(renderedLines.some((line) => line.includes("Hello Pi")));
		assert.deepEqual(
			JSON.parse(
				readFileSync(path.join(root, ".pi", "settings.json"), "utf8"),
			),
			{ packages: ["npm:pi-rakit-onboarding"] },
		);
		assert.equal(reloaded, true);
		assert.equal(notifications.at(-1).level, "info");
		assert.match(notifications.at(-1).message, /Reloading Pi/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
