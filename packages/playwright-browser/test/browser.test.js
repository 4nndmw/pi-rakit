import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
	artifactPath,
	validateScenario,
} from "../skills/playwright-browser/scripts/browser.mjs";

test("validates and normalizes a browser scenario", () => {
	const scenario = validateScenario({
		steps: [
			{ action: "goto", url: "https://example.com" },
			{ action: "text", selector: "h1", name: "heading" },
			{ action: "screenshot", path: "home.png", fullPage: true },
		],
	});

	assert.equal(scenario.browser, "chromium");
	assert.equal(scenario.headless, true);
	assert.equal(scenario.timeout, 30_000);
	assert.equal(scenario.outputDir, "playwright-artifacts");
});

test("rejects unknown actions, fields, and unsafe URLs", () => {
	assert.throws(
		() => validateScenario({ steps: [{ action: "evaluate", code: "1+1" }] }),
		/Unsupported action/,
	);
	assert.throws(
		() =>
			validateScenario({
				steps: [{ action: "goto", url: "file:\/\/\/etc\/passwd" }],
			}),
		/http or https/,
	);
	assert.throws(
		() =>
			validateScenario({
				steps: [{ action: "click", selector: "button", force: true }],
			}),
		/Unknown field/,
	);
});

test("validates action-specific values", () => {
	assert.throws(
		() =>
			validateScenario({
				steps: [{ action: "waitFor", selector: "main", state: "ready" }],
			}),
		/steps\[0\]\.state/,
	);
	assert.throws(
		() =>
			validateScenario({
				steps: [{ action: "fill", selector: "input", value: 123 }],
			}),
		/steps\[0\]\.value/,
	);
});

test("keeps artifacts inside the configured output directory", () => {
	const cwd = path.resolve("project");
	const output = artifactPath(cwd, "artifacts", "screens/home.png");
	assert.equal(output, path.join(cwd, "artifacts", "screens", "home.png"));
	assert.throws(
		() => artifactPath(cwd, "artifacts", "../secret.txt"),
		/must stay inside/,
	);
	assert.throws(
		() => artifactPath(cwd, "../outside", "file.png"),
		/must stay inside the working directory/,
	);
});
