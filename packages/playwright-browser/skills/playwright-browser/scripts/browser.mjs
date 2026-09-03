#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const BROWSERS = new Set(["chromium", "firefox", "webkit"]);
const WAIT_UNTIL = new Set([
	"load",
	"domcontentloaded",
	"networkidle",
	"commit",
]);
const WAIT_STATES = new Set(["attached", "detached", "visible", "hidden"]);
const BUTTONS = new Set(["left", "right", "middle"]);
const PDF_FORMATS = new Set([
	"Letter",
	"Legal",
	"Tabloid",
	"Ledger",
	"A0",
	"A1",
	"A2",
	"A3",
	"A4",
	"A5",
	"A6",
]);
const TOP_LEVEL_FIELDS = new Set([
	"browser",
	"headless",
	"viewport",
	"timeout",
	"outputDir",
	"steps",
]);
const ACTION_FIELDS = {
	goto: new Set(["action", "url", "waitUntil"]),
	click: new Set(["action", "selector", "button", "clickCount"]),
	fill: new Set(["action", "selector", "value", "sensitive"]),
	press: new Set(["action", "selector", "key"]),
	select: new Set(["action", "selector", "value"]),
	check: new Set(["action", "selector"]),
	uncheck: new Set(["action", "selector"]),
	waitFor: new Set(["action", "selector", "state", "timeout"]),
	text: new Set(["action", "selector", "name"]),
	html: new Set(["action", "selector", "name"]),
	links: new Set(["action", "selector", "name"]),
	assertText: new Set(["action", "selector", "contains"]),
	assertVisible: new Set(["action", "selector"]),
	screenshot: new Set(["action", "path", "fullPage"]),
	pdf: new Set(["action", "path", "format"]),
};

function object(value, label) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object.`);
	}
	return value;
}

function string(value, label, { optional = false } = {}) {
	if (optional && value === undefined) return;
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${label} must be a non-empty string.`);
	}
}

function boolean(value, label, { optional = false } = {}) {
	if (optional && value === undefined) return;
	if (typeof value !== "boolean")
		throw new Error(`${label} must be a boolean.`);
}

function integer(value, label, minimum, maximum, { optional = false } = {}) {
	if (optional && value === undefined) return;
	if (!Number.isInteger(value) || value < minimum || value > maximum) {
		throw new Error(
			`${label} must be an integer from ${minimum} to ${maximum}.`,
		);
	}
}

function rejectUnknownFields(value, allowed, label) {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) throw new Error(`Unknown field ${label}.${key}.`);
	}
}

function oneOf(value, allowed, label, { optional = false } = {}) {
	if (optional && value === undefined) return;
	if (!allowed.has(value)) {
		throw new Error(`${label} must be one of: ${[...allowed].join(", ")}.`);
	}
}

function validateRelativePath(value, label) {
	string(value, label);
	if (path.isAbsolute(value)) throw new Error(`${label} must be relative.`);
}

function validateUrl(value, label) {
	string(value, label);
	let parsed;
	try {
		parsed = new URL(value);
	} catch {
		throw new Error(`${label} must be a valid URL.`);
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`${label} must use http or https.`);
	}
}

function validateStep(input, index) {
	const step = object(input, `steps[${index}]`);
	string(step.action, `steps[${index}].action`);
	const fields = ACTION_FIELDS[step.action];
	if (!fields)
		throw new Error(`Unsupported action at steps[${index}]: ${step.action}.`);
	rejectUnknownFields(step, fields, `steps[${index}]`);
	const label = `steps[${index}]`;

	switch (step.action) {
		case "goto":
			validateUrl(step.url, `${label}.url`);
			oneOf(step.waitUntil, WAIT_UNTIL, `${label}.waitUntil`, {
				optional: true,
			});
			break;
		case "click":
			string(step.selector, `${label}.selector`);
			oneOf(step.button, BUTTONS, `${label}.button`, { optional: true });
			integer(step.clickCount, `${label}.clickCount`, 1, 3, { optional: true });
			break;
		case "fill":
			string(step.selector, `${label}.selector`);
			if (typeof step.value !== "string")
				throw new Error(`${label}.value must be a string.`);
			boolean(step.sensitive, `${label}.sensitive`, { optional: true });
			break;
		case "press":
			string(step.selector, `${label}.selector`);
			string(step.key, `${label}.key`);
			break;
		case "select":
			string(step.selector, `${label}.selector`);
			if (
				typeof step.value !== "string" &&
				(!Array.isArray(step.value) ||
					step.value.some((value) => typeof value !== "string"))
			) {
				throw new Error(
					`${label}.value must be a string or an array of strings.`,
				);
			}
			break;
		case "check":
		case "uncheck":
		case "assertVisible":
			string(step.selector, `${label}.selector`);
			break;
		case "waitFor":
			string(step.selector, `${label}.selector`);
			oneOf(step.state, WAIT_STATES, `${label}.state`, { optional: true });
			integer(step.timeout, `${label}.timeout`, 100, 120_000, {
				optional: true,
			});
			break;
		case "text":
		case "html":
		case "links":
			string(step.selector, `${label}.selector`, { optional: true });
			string(step.name, `${label}.name`, { optional: true });
			break;
		case "assertText":
			string(step.selector, `${label}.selector`, { optional: true });
			string(step.contains, `${label}.contains`);
			break;
		case "screenshot":
			validateRelativePath(step.path, `${label}.path`);
			if (!/\.(png|jpe?g)$/i.test(step.path)) {
				throw new Error(`${label}.path must end in .png, .jpg, or .jpeg.`);
			}
			boolean(step.fullPage, `${label}.fullPage`, { optional: true });
			break;
		case "pdf":
			validateRelativePath(step.path, `${label}.path`);
			if (!/\.pdf$/i.test(step.path))
				throw new Error(`${label}.path must end in .pdf.`);
			oneOf(step.format, PDF_FORMATS, `${label}.format`, { optional: true });
			break;
	}

	return { ...step };
}

export function validateScenario(input) {
	const scenario = object(input, "Scenario");
	rejectUnknownFields(scenario, TOP_LEVEL_FIELDS, "scenario");
	const browser = scenario.browser ?? "chromium";
	oneOf(browser, BROWSERS, "browser");
	const headless = scenario.headless ?? true;
	boolean(headless, "headless");
	const timeout = scenario.timeout ?? 30_000;
	integer(timeout, "timeout", 100, 120_000);
	const outputDir = scenario.outputDir ?? "playwright-artifacts";
	validateRelativePath(outputDir, "outputDir");

	let viewport = { width: 1280, height: 720 };
	if (scenario.viewport !== undefined) {
		viewport = object(scenario.viewport, "viewport");
		rejectUnknownFields(viewport, new Set(["width", "height"]), "viewport");
		integer(viewport.width, "viewport.width", 320, 7680);
		integer(viewport.height, "viewport.height", 320, 7680);
		viewport = { ...viewport };
	}
	if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
		throw new Error("steps must be a non-empty array.");
	}
	if (scenario.steps.length > 200)
		throw new Error("steps cannot contain more than 200 actions.");

	return {
		browser,
		headless,
		viewport,
		timeout,
		outputDir,
		steps: scenario.steps.map(validateStep),
	};
}

function isInside(parent, child) {
	const relative = path.relative(parent, child);
	return (
		relative === "" ||
		(!relative.startsWith("..") && !path.isAbsolute(relative))
	);
}

export function artifactPath(cwd, outputDir, filePath) {
	const workingDirectory = path.resolve(cwd);
	const outputRoot = path.resolve(workingDirectory, outputDir);
	if (!isInside(workingDirectory, outputRoot)) {
		throw new Error("outputDir must stay inside the working directory.");
	}
	const destination = path.resolve(outputRoot, filePath);
	if (!isInside(outputRoot, destination)) {
		throw new Error("Artifact path must stay inside outputDir.");
	}
	return destination;
}

function target(page, selector) {
	return selector ? page.locator(selector) : page.locator("body");
}

async function executeStep(page, step, context) {
	switch (step.action) {
		case "goto":
			await page.goto(step.url, { waitUntil: step.waitUntil ?? "load" });
			return { url: page.url(), title: await page.title() };
		case "click":
			await page.locator(step.selector).click({
				button: step.button,
				clickCount: step.clickCount,
			});
			return {};
		case "fill":
			await page.locator(step.selector).fill(step.value);
			return { value: step.sensitive ? "[REDACTED]" : step.value };
		case "press":
			await page.locator(step.selector).press(step.key);
			return { key: step.key };
		case "select": {
			const selected = await page
				.locator(step.selector)
				.selectOption(step.value);
			return { selected };
		}
		case "check":
			await page.locator(step.selector).check();
			return {};
		case "uncheck":
			await page.locator(step.selector).uncheck();
			return {};
		case "waitFor":
			await page.locator(step.selector).waitFor({
				state: step.state ?? "visible",
				timeout: step.timeout,
			});
			return { state: step.state ?? "visible" };
		case "text": {
			const value = (await target(page, step.selector).innerText()).trim();
			context.values[step.name ?? `text-${context.index + 1}`] = value;
			return { value };
		}
		case "html": {
			const value = step.selector
				? await page.locator(step.selector).innerHTML()
				: await page.content();
			context.values[step.name ?? `html-${context.index + 1}`] = value;
			return { value };
		}
		case "links": {
			const locator = step.selector
				? page.locator(step.selector)
				: page.locator("a[href]");
			const count = await locator.count();
			const value = [];
			for (let index = 0; index < count; index += 1) {
				const link = locator.nth(index);
				value.push({
					text: (await link.innerText()).trim(),
					href: await link.getAttribute("href"),
				});
			}
			context.values[step.name ?? `links-${context.index + 1}`] = value;
			return { value };
		}
		case "assertText": {
			const actual = (await target(page, step.selector).innerText()).trim();
			if (!actual.includes(step.contains)) {
				throw new Error(
					`Expected text to contain ${JSON.stringify(step.contains)}.`,
				);
			}
			return { contains: step.contains };
		}
		case "assertVisible":
			if (!(await page.locator(step.selector).isVisible())) {
				throw new Error(
					`Expected ${JSON.stringify(step.selector)} to be visible.`,
				);
			}
			return { visible: true };
		case "screenshot": {
			const destination = artifactPath(
				context.cwd,
				context.outputDir,
				step.path,
			);
			await mkdir(path.dirname(destination), { recursive: true });
			await page.screenshot({
				path: destination,
				fullPage: step.fullPage ?? false,
			});
			context.artifacts.push(destination);
			return { path: destination };
		}
		case "pdf": {
			if (context.browser !== "chromium") {
				throw new Error("PDF output is available only with Chromium.");
			}
			const destination = artifactPath(
				context.cwd,
				context.outputDir,
				step.path,
			);
			await mkdir(path.dirname(destination), { recursive: true });
			await page.pdf({ path: destination, format: step.format ?? "A4" });
			context.artifacts.push(destination);
			return { path: destination };
		}
	}
}

export async function runScenario(input, options = {}) {
	const scenario = validateScenario(input);
	const cwd = path.resolve(options.cwd ?? process.cwd());
	artifactPath(cwd, scenario.outputDir, ".");
	const playwright = options.playwright ?? (await import("playwright"));
	const browserType = playwright[scenario.browser];
	if (!browserType?.launch)
		throw new Error(`Playwright browser is unavailable: ${scenario.browser}.`);
	const browser = await browserType.launch({ headless: scenario.headless });
	const context = await browser.newContext({ viewport: scenario.viewport });
	context.setDefaultTimeout(scenario.timeout);
	const page = await context.newPage();
	const result = {
		browser: scenario.browser,
		steps: [],
		values: {},
		artifacts: [],
	};

	try {
		for (let index = 0; index < scenario.steps.length; index += 1) {
			const step = scenario.steps[index];
			const detail = await executeStep(page, step, {
				browser: scenario.browser,
				cwd,
				outputDir: scenario.outputDir,
				index,
				values: result.values,
				artifacts: result.artifacts,
			});
			result.steps.push({ index: index + 1, action: step.action, ...detail });
		}
		result.url = page.url();
		result.title = await page.title();
		return result;
	} finally {
		await browser.close();
	}
}

async function main() {
	const scenarioPath = process.argv[2];
	if (!scenarioPath || process.argv.length > 3) {
		throw new Error("Usage: node browser.mjs <scenario.json>");
	}
	const absolutePath = path.resolve(scenarioPath);
	const input = JSON.parse(await readFile(absolutePath, "utf8"));
	const result = await runScenario(input, { cwd: process.cwd() });
	console.log(JSON.stringify(result, null, 2));
}

const isMain =
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
