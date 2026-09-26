/**
 * setup-providers — a floating-overlay wizard to manage custom providers and
 * models stored in `~/.pi/agent/models.json`.
 *
 * Command: /setup-custom-providers
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { matchesKey, visibleWidth } from "@earendil-works/pi-tui";

const MODELS_PATH = join(homedir(), ".pi", "agent", "models.json");
const MODELS_BACKUP_PATH = `${MODELS_PATH}.bak`;

const API_TYPES = [
	"openai-completions",
	"openai-responses",
	"anthropic-messages",
	"google-generative-ai",
	"mistral-conversations",
	"bedrock-converse-stream",
];

const API_LABELS = {
	"openai-completions": "OpenAI Chat Completions",
	"openai-responses": "OpenAI Responses",
	"anthropic-messages": "Anthropic Messages",
	"google-generative-ai": "Google Generative AI",
	"mistral-conversations": "Mistral Conversations",
	"bedrock-converse-stream": "AWS Bedrock Stream",
};

const registeredProviders = new Set();
const providerHealth = new Map();

// ── data helpers ─────────────────────────────────────────────────────

function apiLabel(api) {
	return API_LABELS[api] ?? api;
}

function guessApi(baseUrl) {
	const url = (baseUrl ?? "").toLowerCase();
	if (url.includes("anthropic") || url.includes("claude")) return "anthropic-messages";
	if (url.includes("gemini") || url.includes("generativelanguage") || url.includes("google")) {
		return "google-generative-ai";
	}
	if (url.includes("mistral")) return "mistral-conversations";
	if (url.includes("bedrock") || url.includes("amazonaws")) return "bedrock-converse-stream";
	if (url.includes("/responses")) return "openai-responses";
	return "openai-completions";
}

function modelSummary(model) {
	const tags = [
		model.input?.includes("image") ? "IMG" : null,
		model.reasoning ? "R" : null,
		`ctx ${model.contextWindow ?? "-"}`,
	].filter(Boolean);
	return `${model.name ?? model.id}  (${tags.join(" | ")})`;
}

function providerEntry(name) {
	if (!providerHealth.has(name)) providerHealth.set(name, {});
	return providerHealth.get(name);
}

function statusIcon(status) {
	if (!status) return "?";
	return status.ok ? "✓" : "✗";
}

function loadModels() {
	try {
		if (!existsSync(MODELS_PATH)) return { providers: {} };
		return JSON.parse(readFileSync(MODELS_PATH, "utf8"));
	} catch {
		return { providers: {} };
	}
}

function saveModels(data) {
	try {
		if (existsSync(MODELS_PATH)) copyFileSync(MODELS_PATH, MODELS_BACKUP_PATH);
	} catch {
		// The backup is best-effort; never block saving.
	}
	writeFileSync(MODELS_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

function registerProviders(pi, data) {
	const providers = data.providers ?? {};
	const names = new Set(Object.keys(providers));
	for (const name of [...registeredProviders]) {
		if (!names.has(name)) {
			pi.unregisterProvider?.(name);
			registeredProviders.delete(name);
		}
	}
	for (const [name, config] of Object.entries(providers)) {
		pi.registerProvider(name, config);
		registeredProviders.add(name);
	}
}

// ── api key helpers ──────────────────────────────────────────────────

function cleanApiKeyInput(raw) {
	let value = String(raw).trim().replace(/^export\s+/i, "");
	const assignment = value.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*([\s\S]+)$/);
	if (assignment) value = assignment[1].trim();
	const unquote = () => {
		const match = value.match(/^(["'`])([\s\S]*)\1;?$/);
		if (match) value = match[2].trim();
	};
	unquote();
	value = value.replace(/^Authorization\s*:\s*/i, "").trim();
	value = value.replace(/^Bearer\s+/i, "").trim();
	unquote();
	return value.replace(/;$/, "").trim();
}

function expandApiKey(apiKey) {
	if (!apiKey) return undefined;
	const key = apiKey.trim();
	if (!key) return undefined;
	if (key.startsWith("!")) {
		try {
			return (
				execSync(key.slice(1), {
					encoding: "utf8",
					stdio: ["ignore", "pipe", "ignore"],
					timeout: 5000,
				}).trim() || undefined
			);
		} catch {
			return undefined;
		}
	}
	if (key.startsWith("$")) return process.env[key.slice(1)] ?? key;
	return process.env[key] ?? key;
}

// ── model discovery ──────────────────────────────────────────────────

function discoveryUrls(baseUrl) {
	if (!baseUrl) return [];
	const base = baseUrl.replace(/\/+$/, "");
	const urls = new Set();
	if (base.endsWith("/v1")) {
		urls.add(`${base}/models`);
		urls.add(base.replace(/\/v1$/, "/models"));
	} else {
		urls.add(`${base}/v1/models`);
		urls.add(`${base}/models`);
	}
	return [...urls];
}

function numberFrom(...values) {
	for (const value of values) {
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string" && value.trim()) {
			const parsed = Number.parseInt(value, 10);
			if (!Number.isNaN(parsed)) return parsed;
		}
	}
	return undefined;
}

function booleanFrom(...values) {
	for (const value of values) {
		if (typeof value === "boolean") return value;
		if (typeof value === "string") {
			const normalized = value.trim().toLowerCase();
			if (["true", "yes", "1", "enabled", "supported"].includes(normalized)) return true;
			if (["false", "no", "0", "disabled", "unsupported"].includes(normalized)) return false;
		}
	}
	return false;
}

function modelFromApi(raw) {
	const id = String(raw?.id ?? raw?.name ?? "").trim();
	if (!id) return undefined;
	const signals = [
		...(Array.isArray(raw.input_modalities) ? raw.input_modalities : []),
		...(Array.isArray(raw.modalities) ? raw.modalities : []),
		...(Array.isArray(raw.input_types) ? raw.input_types : []),
		...(Array.isArray(raw.capabilities?.input) ? raw.capabilities.input : []),
	].map((value) => String(value).toLowerCase());
	const supportsImage =
		signals.some((value) => value.includes("image") || value.includes("vision")) ||
		booleanFrom(
			raw.supports_image,
			raw.supports_vision,
			raw.supportsImage,
			raw.supportsVision,
			raw.vision,
			raw.capabilities?.vision,
			raw.capabilities?.image,
		);
	const reasoning = booleanFrom(
		raw.reasoning,
		raw.supports_reasoning,
		raw.supportsReasoning,
		raw.capabilities?.reasoning,
		raw.features?.reasoning,
	);
	const contextWindow =
		numberFrom(
			raw.context_window,
			raw.contextWindow,
			raw.max_context_window,
			raw.maxContextWindow,
			raw.max_context_length,
			raw.maxContextLength,
			raw.capabilities?.context_window,
			raw.capabilities?.contextWindow,
		) ?? 128000;
	const maxTokens =
		numberFrom(
			raw.max_output_tokens,
			raw.maxOutputTokens,
			raw.max_completion_tokens,
			raw.maxCompletionTokens,
			raw.max_tokens,
			raw.maxTokens,
			raw.capabilities?.max_output_tokens,
			raw.capabilities?.maxOutputTokens,
		) ?? 16384;
	return {
		id,
		name: String(raw.name ?? id).trim() || id,
		reasoning,
		input: supportsImage ? ["text", "image"] : ["text"],
		contextWindow,
		maxTokens,
	};
}

async function discoverModels(config) {
	const headers = {};
	const apiKey = expandApiKey(config.apiKey);
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	let lastError = "No discovery endpoint available";
	for (const url of discoveryUrls(config.baseUrl)) {
		try {
			const response = await fetch(url, { headers });
			if (!response.ok) {
				lastError = `${response.status} ${response.statusText} at ${url}`;
				continue;
			}
			const payload = await response.json();
			const list = Array.isArray(payload?.data)
				? payload.data
				: Array.isArray(payload?.models)
					? payload.models
					: [];
			const unique = new Map();
			for (const raw of list) {
				const model = modelFromApi(raw);
				if (model) unique.set(model.id, model);
			}
			if (unique.size > 0) return { url, models: [...unique.values()] };
			lastError = `No models in response at ${url}`;
		} catch (error) {
			lastError = `${error instanceof Error ? error.message : String(error)} at ${url}`;
		}
	}
	throw new Error(lastError);
}

function appendModel(config, model) {
	config.models ??= [];
	const id = model.id.trim();
	if (config.models.some((existing) => existing.id.trim().toLowerCase() === id.toLowerCase())) {
		return false;
	}
	config.models.push({
		id,
		name: model.name || id,
		reasoning: model.reasoning,
		input: model.input,
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	});
	return true;
}

// ── chat completion test ─────────────────────────────────────────────

function joinUrl(baseUrl, suffix) {
	const base = (baseUrl ?? "").replace(/\/+$/, "");
	if (!base) return suffix;
	if (base.endsWith(suffix)) return base;
	return `${base}${suffix}`;
}

function responsePreview(payload) {
	const text =
		payload?.choices?.[0]?.message?.content ??
		payload?.output_text ??
		payload?.content?.[0]?.text ??
		payload?.message?.content ??
		JSON.stringify(payload).slice(0, 180);
	return String(text).replace(/\s+/g, " ").trim().slice(0, 180);
}

async function sendChatTest(config, modelId) {
	const api = config.api ?? guessApi(config.baseUrl);
	const apiKey = expandApiKey(config.apiKey);
	const headers = { "Content-Type": "application/json" };
	let url;
	let body;

	if (api === "anthropic-messages") {
		url = joinUrl(config.baseUrl?.replace(/\/v1$/, ""), "/v1/messages");
		if (apiKey) {
			headers["x-api-key"] = apiKey;
			headers["anthropic-version"] = "2023-06-01";
		}
		body = {
			model: modelId,
			max_tokens: 8,
			messages: [{ role: "user", content: "Reply with OK only." }],
		};
	} else if (api === "openai-responses") {
		url = joinUrl(config.baseUrl, "/responses");
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
		body = { model: modelId, input: "Reply with OK only.", max_output_tokens: 8, stream: false };
	} else if (api === "openai-completions" || api === "mistral-conversations") {
		url = joinUrl(config.baseUrl, "/chat/completions");
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
		body = {
			model: modelId,
			messages: [{ role: "user", content: "Reply with OK only." }],
			max_tokens: 8,
			stream: false,
		};
	} else {
		throw new Error(`Chat test is not supported for ${apiLabel(api)}`);
	}

	const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
	const raw = await response.text();
	let payload = raw;
	try {
		payload = JSON.parse(raw);
	} catch {
		// keep the raw text
	}
	if (!response.ok) {
		const detail = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
		throw new Error(`${response.status} ${response.statusText}: ${String(detail).slice(0, 300)}`);
	}
	return {
		url,
		preview: responsePreview(payload),
		full: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
	};
}

// ── overlay engine ───────────────────────────────────────────────────

function wrapPlainText(text, width) {
	const lines = [];
	for (const raw of String(text).split("\n")) {
		if (raw.length === 0) {
			lines.push("");
			continue;
		}
		let rest = raw;
		while (visibleWidth(rest) > width) {
			let cut = Math.max(1, width);
			while (cut > 1 && visibleWidth(rest.slice(0, cut)) > width) cut--;
			lines.push(rest.slice(0, cut));
			rest = rest.slice(cut);
		}
		lines.push(rest);
	}
	return lines;
}

function padTo(text, width) {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function drawFrame(theme, width, title, body, footer) {
	const inner = width - 2;
	const lines = [theme.fg("border", `╭${"─".repeat(inner)}╮`)];
	const titlePad = Math.max(1, Math.floor((inner - visibleWidth(title)) / 2));
	lines.push(
		theme.fg("border", "│") +
			padTo(" ".repeat(titlePad) + theme.bold(theme.fg("accent", title)), inner) +
			theme.fg("border", "│"),
	);
	lines.push(theme.fg("border", `├${"─".repeat(inner)}┤`));
	lines.push(theme.fg("border", "│") + padTo("", inner) + theme.fg("border", "│"));
	for (const row of body) {
		const content = row ? theme.fg("text", `  ${row}`) : "    ";
		lines.push(theme.fg("border", "│") + padTo(content, inner) + theme.fg("border", "│"));
	}
	lines.push(theme.fg("border", "│") + padTo("", inner) + theme.fg("border", "│"));
	if (footer) {
		const footerPad = Math.max(1, Math.floor((inner - visibleWidth(footer)) / 2));
		lines.push(
			theme.fg("border", "│") +
				padTo(" ".repeat(footerPad) + theme.fg("dim", footer), inner) +
				theme.fg("border", "│"),
		);
	}
	lines.push(theme.fg("border", `╰${"─".repeat(inner)}╯`));
	return lines;
}

function sanitizePaste(chunk) {
	return String(chunk)
		.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
		.replace(/\x1b[PX^_][^\x1b]*(?:\x1b\\|$)/g, "")
		.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
		.replace(/\x1b./g, "")
		.replace(/[\x00-\x1f\x7f]/g, "")
		.replace(/^\[?200~/, "")
		.replace(/\[?201~$/, "");
}

// Search/filter state shared by menus and multi-select overlays.
function makeFilter() {
	const state = { active: false, query: "" };
	const handle = (data, reset, render) => {
		if (!state.active) return false;
		if (matchesKey(data, "escape")) {
			state.active = false;
			state.query = "";
			reset();
			render();
			return true;
		}
		if (matchesKey(data, "backspace")) {
			state.query = state.query.slice(0, -1);
			reset();
			render();
			return true;
		}
		if (matchesKey(data, "return") || matchesKey(data, "enter")) {
			state.active = false;
			render();
			return true;
		}
		if (data.length === 1 && data >= " ") {
			state.query += data;
			reset();
			render();
			return true;
		}
		return false;
	};
	return { state, handle };
}

async function overlayMenu(ctx, title, entries, initialIndex = 0) {
	return ctx.ui.custom(
		(tui, theme, _keys, done) => {
			let index = Math.max(0, Math.min(initialIndex, Math.max(0, entries.length - 1)));
			const filter = makeFilter();

			const visible = () => {
				const needle = filter.state.query.trim().toLowerCase();
				const list = entries.map((entry, position) => ({ ...entry, position }));
				if (!needle) return list;
				return list.filter((entry) => entry.label.toLowerCase().includes(needle));
			};
			const clamp = () => {
				const list = visible();
				index = Math.max(0, Math.min(index, Math.max(0, list.length - 1)));
				return list;
			};
			const reset = () => {
				index = 0;
			};

			return {
				invalidate() {},
				handleInput(data) {
					if (filter.handle(data, reset, () => tui.requestRender())) return;
					const list = clamp();
					if (matchesKey(data, "escape")) {
						done(undefined);
						return;
					}
					if (data === "/") {
						filter.state.active = true;
						filter.state.query = "";
						reset();
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "return") || matchesKey(data, "enter")) {
						const entry = list[index];
						if (entry) done(entry.value);
						return;
					}
					if (matchesKey(data, "up")) {
						index = Math.max(0, index - 1);
						tui.requestRender();
					} else if (matchesKey(data, "down")) {
						index = Math.min(list.length - 1, index + 1);
						tui.requestRender();
					}
				},
				render(width) {
					const list = clamp();
					const body = [];
					if (filter.state.active || filter.state.query) {
						body.push(
							theme.fg("dim", `Filter /${filter.state.query}${filter.state.active ? "_" : ""}  (${list.length}/${entries.length})`),
						);
						body.push("");
					}
					if (list.length === 0) {
						body.push(theme.fg("warning", "No matches"));
					} else {
						list.forEach((entry, position) => {
							const pointer = position === index ? theme.fg("accent", "▶  ") : "    ";
							const label = position === index ? theme.fg("accent", entry.label) : theme.fg("text", entry.label);
							body.push(pointer + label);
						});
					}
					return drawFrame(
						theme,
						Math.min(68, width - 4),
						title,
						body,
						filter.state.active
							? "type to filter  |  Enter keep  |  Esc clear"
							: "↑↓ navigate  |  / filter  |  Enter select  |  Esc cancel",
					);
				},
			};
		},
		{ overlay: true },
	);
}

async function overlayInput(ctx, title, placeholder, opts = {}) {
	return ctx.ui.custom(
		(tui, theme, _keys, done) => {
			let text = "";
			let cursor = 0;
			const mask = opts.mask ?? false;

			const shown = () => (mask ? "•".repeat(text.length) : text);
			const submit = () => {
				const raw = opts.cleanSecret ? cleanApiKeyInput(text) : text.trim();
				done(raw || undefined);
			};

			return {
				invalidate() {},
				handleInput(data) {
					if (matchesKey(data, "escape")) {
						done(undefined);
						return;
					}
					if (matchesKey(data, "return") || matchesKey(data, "enter")) {
						submit();
						return;
					}
					if (matchesKey(data, "backspace")) {
						if (cursor > 0) {
							text = text.slice(0, cursor - 1) + text.slice(cursor);
							cursor--;
							tui.requestRender();
						}
						return;
					}
					if (matchesKey(data, "delete")) {
						if (cursor < text.length) {
							text = text.slice(0, cursor) + text.slice(cursor + 1);
							tui.requestRender();
						}
						return;
					}
					if (matchesKey(data, "home") || matchesKey(data, "ctrl+a")) {
						cursor = 0;
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "end") || matchesKey(data, "ctrl+e")) {
						cursor = text.length;
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "left")) {
						cursor = Math.max(0, cursor - 1);
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "right")) {
						cursor = Math.min(text.length, cursor + 1);
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "up") || matchesKey(data, "down")) return;

					const clean = sanitizePaste(data);
					if (!clean) return;
					text = text.slice(0, cursor) + clean + text.slice(cursor);
					cursor += clean.length;
					tui.requestRender();
				},
				render(width) {
					const boxWidth = Math.min(68, width - 4);
					const prefix = "  >  ";
					const fieldWidth = Math.max(8, boxWidth - 4 - visibleWidth(prefix));
					const body = [];
					if (text.length === 0) {
						body.push(
							"",
							theme.fg("text", prefix) + "\x1b[7m \x1b[27m" + theme.fg("dim", placeholder.slice(0, fieldWidth - 1)),
							"",
						);
					} else {
						const display = shown();
						let start = 0;
						if (cursor >= fieldWidth) start = cursor - fieldWidth + 1;
						start = Math.max(0, Math.min(start, Math.max(0, display.length - fieldWidth)));
						const view = display.slice(start, start + fieldWidth);
						const at = cursor - start;
						const before = view.slice(0, at);
						const current = cursor < display.length ? display[cursor] : " ";
						const after = cursor < display.length ? view.slice(at + 1) : "";
						body.push(
							"",
							theme.fg("text", prefix + before) + "\x1b[7m" + current + "\x1b[27m" + theme.fg("text", after),
							"",
						);
					}
					return drawFrame(
						theme,
						boxWidth,
						title,
						body,
						mask ? "Paste  |  hidden  |  Enter submit  |  Esc cancel" : "Paste  |  Enter submit  |  Esc cancel",
					);
				},
			};
		},
		{ overlay: true },
	);
}

async function overlayConfirm(ctx, title, message) {
	const result = await ctx.ui.custom(
		(tui, theme, _keys, done) => {
			let yes = true;
			return {
				invalidate() {},
				handleInput(data) {
					if (matchesKey(data, "escape")) {
						done(undefined);
						return;
					}
					if (matchesKey(data, "return") || matchesKey(data, "enter")) {
						done(yes);
						return;
					}
					if (matchesKey(data, "left") || matchesKey(data, "up")) {
						yes = true;
						tui.requestRender();
					} else if (matchesKey(data, "right") || matchesKey(data, "down")) {
						yes = false;
						tui.requestRender();
					}
				},
				render(width) {
					const body = [
						"",
						`  ${message}`,
						"",
						`${yes ? theme.fg("accent", "▶") : " "} ${theme.fg("success", " Yes ")}   ${!yes ? theme.fg("accent", "▶") : " "} ${theme.fg("error", " No ")}`,
						"",
					];
					return drawFrame(theme, Math.min(56, width - 4), title, body, "←→ select  |  Enter confirm  |  Esc cancel");
				},
			};
		},
		{ overlay: true },
	);
	return result === true;
}

async function overlayInfo(ctx, title, content) {
	await ctx.ui.custom(
		(tui, theme, _keys, done) => {
			let scroll = 0;
			const rows = Array.isArray(content) ? content : [String(content)];
			const maxRows = 18;
			return {
				invalidate() {},
				handleInput(data) {
					if (matchesKey(data, "escape") || matchesKey(data, "return") || data.toLowerCase() === "q") {
						done();
						return;
					}
					const last = Math.max(0, rows.length - 1);
					if (matchesKey(data, "up")) {
						scroll = Math.max(0, scroll - 1);
						tui.requestRender();
					} else if (matchesKey(data, "down")) {
						scroll = Math.min(last, scroll + 1);
						tui.requestRender();
					} else if (matchesKey(data, "pageup")) {
						scroll = Math.max(0, scroll - maxRows);
						tui.requestRender();
					} else if (matchesKey(data, "pagedown")) {
						scroll = Math.min(last, scroll + maxRows);
						tui.requestRender();
					}
				},
				render(width) {
					const boxWidth = Math.min(100, width - 4);
					const textWidth = Math.max(20, boxWidth - 8);
					const wrapped = rows.flatMap((line) => wrapPlainText(line, textWidth));
					const maxScroll = Math.max(0, wrapped.length - maxRows);
					scroll = Math.max(0, Math.min(scroll, maxScroll));
					const visible = wrapped.slice(scroll, scroll + maxRows);
					const body = [
						theme.fg("dim", `Showing ${wrapped.length ? scroll + 1 : 0}-${scroll + visible.length} of ${wrapped.length}`),
						"",
						...visible,
					];
					return drawFrame(theme, boxWidth, title, body, "↑↓ scroll  |  PgUp/PgDn  |  Enter/Q/Esc close");
				},
			};
		},
		{ overlay: true },
	);
}

async function overlayPickModels(ctx, title, models, existingIds) {
	return ctx.ui.custom(
		(tui, theme, _keys, done) => {
			let index = 0;
			let scroll = 0;
			const filter = makeFilter();
			const maxRows = 10;
			const taken = (model) => existingIds.has(model.id.trim().toLowerCase());
			const selectable = models.filter((model) => !taken(model));
			const selected = new Set(selectable.map((model) => model.id));

			const visible = () => {
				const needle = filter.state.query.trim().toLowerCase();
				const list = needle
					? models.filter((model) => `${model.name ?? ""} ${model.id}`.toLowerCase().includes(needle))
					: models;
				index = Math.max(0, Math.min(index, Math.max(0, list.length - 1)));
				scroll = Math.max(0, Math.min(scroll, Math.max(0, list.length - maxRows)));
				if (index < scroll) scroll = index;
				if (index >= scroll + maxRows) scroll = index - maxRows + 1;
				return list;
			};
			const reset = () => {
				index = 0;
				scroll = 0;
			};
			const toggle = () => {
				const model = visible()[index];
				if (!model || taken(model)) return;
				if (selected.has(model.id)) selected.delete(model.id);
				else selected.add(model.id);
				tui.requestRender();
			};
			const toggleAll = () => {
				if (selected.size === selectable.length) {
					selected.clear();
				} else {
					selected.clear();
					for (const model of selectable) selected.add(model.id);
				}
				tui.requestRender();
			};

			return {
				invalidate() {},
				handleInput(data) {
					if (filter.handle(data, reset, () => tui.requestRender())) return;
					const list = visible();
					if (matchesKey(data, "escape")) {
						done(undefined);
						return;
					}
					if (data === "/") {
						filter.state.active = true;
						filter.state.query = "";
						reset();
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "up")) {
						index = Math.max(0, index - 1);
						visible();
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "down")) {
						index = Math.min(list.length - 1, index + 1);
						visible();
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "return") || data === " ") {
						toggle();
						return;
					}
					if (data.toLowerCase() === "a") {
						toggleAll();
						return;
					}
					if (data.toLowerCase() === "s") {
						done(new Set(selected));
					}
				},
				render(width) {
					const list = visible();
					const alreadyAdded = models.filter((model) => taken(model)).length;
					const visibleSlice = list.slice(scroll, scroll + maxRows);
					const body = [
						theme.fg("dim", `Found ${models.length}  |  ${alreadyAdded} already added  |  ${selected.size} selected`),
						theme.fg(
							"dim",
							filter.state.query
								? `Filter /${filter.state.query}${filter.state.active ? "_" : ""}  |  showing ${scroll + (visibleSlice.length ? 1 : 0)}-${scroll + visibleSlice.length} of ${list.length}`
								: `Showing ${scroll + (visibleSlice.length ? 1 : 0)}-${scroll + visibleSlice.length} of ${list.length}`,
						),
						"",
					];
					if (scroll > 0) body.push(theme.fg("dim", `... ${scroll} more above ...`));
					if (visibleSlice.length === 0) body.push(theme.fg("warning", "No matches"));
					visibleSlice.forEach((model, offset) => {
						const position = scroll + offset;
						const current = position === index;
						const exists = taken(model);
						const marker = exists ? "[+]" : selected.has(model.id) ? "[x]" : "[ ]";
						const flags = [
							model.input.includes("image") ? "IMG" : null,
							model.reasoning ? "R" : null,
							`ctx ${model.contextWindow}`,
							`out ${model.maxTokens}`,
							exists ? "added" : null,
						]
							.filter(Boolean)
							.join(" | ");
						const label = `${marker} ${model.name}${model.name !== model.id ? ` (${model.id})` : ""}`;
						const line = `${label}  ${theme.fg("dim", flags)}`;
						body.push((current ? theme.fg("accent", "▶  ") : "    ") + (current ? theme.fg("accent", line) : theme.fg("text", line)));
					});
					const remaining = Math.max(0, list.length - (scroll + visibleSlice.length));
					if (remaining > 0) body.push(theme.fg("dim", `... ${remaining} more below ...`));
					return drawFrame(
						theme,
						Math.min(92, width - 4),
						title,
						body,
						filter.state.active
							? "type filter  |  Enter keep  |  Esc clear"
							: "↑↓ move  |  / filter  |  Enter toggle  |  A all  |  S add  |  Esc cancel",
					);
				},
			};
		},
		{ overlay: true },
	);
}

// ── wizard flows ─────────────────────────────────────────────────────

async function mainMenu(ctx, data) {
	const providers = data.providers ?? {};
	const names = Object.keys(providers);
	const entries = [{ label: "Add new provider", value: "add" }];
	for (const name of names) {
		const count = providers[name]?.models?.length ?? 0;
		entries.push({ label: `  ${name}  (${count} model${count === 1 ? "" : "s"})`, value: `edit:${name}` });
	}
	if (names.length > 0) entries.push({ label: "Remove provider", value: "remove" });
	entries.push({ label: "Save changes", value: "exit" });
	entries.push({ label: "Exit", value: "exit" });

	const choice = await overlayMenu(ctx, "Custom Providers Setup", entries);
	if (!choice || choice === "exit") return false;
	if (choice === "add") {
		await addProvider(ctx, data);
		return true;
	}
	if (choice === "remove") {
		await removeProvider(ctx, data);
		return true;
	}
	if (choice.startsWith("edit:")) {
		await providerMenu(ctx, data, choice.slice(5));
		return true;
	}
	return true;
}

async function providerMenu(ctx, data, name) {
	const config = data.providers?.[name];
	if (!config) return;
	const health = providerHealth.get(name);
	const count = config.models?.length ?? 0;
	const entries = [
		{
			label: `Health: discovery ${statusIcon(health?.discovery)} | chat ${statusIcon(health?.chat)} | ${count} model${count === 1 ? "" : "s"}`,
			value: "health",
		},
		{ label: "Add model", value: "add-model" },
		{ label: "Discover models from API", value: "discover" },
		{ label: "Test discovery endpoint", value: "test-discovery" },
		{ label: "Test chat completion", value: "test-chat" },
		{ label: "Manage models", value: "manage" },
		{ label: "Edit config", value: "edit-config" },
		{ label: "Back", value: "back" },
	];

	const choice = await overlayMenu(ctx, `Provider: ${name}`, entries);
	if (!choice || choice === "back") return;
	if (choice === "health") await showHealth(ctx, name, config);
	else if (choice === "add-model") await addModelManually(ctx, config, name);
	else if (choice === "discover") await discoverAndAdd(ctx, config, name);
	else if (choice === "test-discovery") await testDiscovery(ctx, config, name);
	else if (choice === "test-chat") await testChat(ctx, config, name);
	else if (choice === "manage") await manageModels(ctx, config, name);
	else if (choice === "edit-config") await editConfig(ctx, config, name);
	await providerMenu(ctx, data, name);
}

async function addProvider(ctx, data) {
	const name = await overlayInput(ctx, "Add Provider", "e.g. ollama");
	if (!name) {
		ctx.ui.notify("Provider name required", "warning");
		return;
	}
	if (data.providers?.[name]) {
		ctx.ui.notify(`Provider "${name}" already exists`, "warning");
		return;
	}
	const baseUrl = await overlayInput(ctx, "Base URL", "http://localhost:11434/v1");
	if (!baseUrl) {
		ctx.ui.notify("Base URL required", "warning");
		return;
	}
	const suggested = guessApi(baseUrl);
	const api = await overlayMenu(
		ctx,
		`Select API type (suggested: ${apiLabel(suggested)})`,
		API_TYPES.map((value) => ({ label: apiLabel(value), value })),
		API_TYPES.indexOf(suggested),
	);
	if (!api) return;
	const apiKey = await overlayInput(ctx, "API Key", "MY_API_KEY", { mask: true, cleanSecret: true });

	data.providers ??= {};
	data.providers[name] = { baseUrl, api, apiKey: apiKey || undefined, models: [] };
	ctx.ui.notify(`Provider "${name}" added`, "info");

	if (await overlayConfirm(ctx, "Discover models?", `Try auto-discover models from "${name}" now?`)) {
		await discoverAndAdd(ctx, data.providers[name], name);
		return;
	}
	if (await overlayConfirm(ctx, "Add first model?", `Add a model to "${name}" manually now?`)) {
		await addModelManually(ctx, data.providers[name], name);
	}
}

async function removeProvider(ctx, data) {
	const names = Object.keys(data.providers ?? {});
	if (names.length === 0) return;
	const name = await overlayMenu(ctx, "Remove Provider", names.map((value) => ({ label: value, value })));
	if (!name) return;
	if (await overlayConfirm(ctx, "Delete provider?", `Remove "${name}" and all of its models?`)) {
		delete data.providers[name];
		providerHealth.delete(name);
		ctx.ui.notify(`Provider "${name}" removed`, "info");
	}
}

async function editConfig(ctx, config, name) {
	const currentApi = config.api ?? guessApi(config.baseUrl);
	const field = await overlayMenu(ctx, `Edit ${name}`, [
		{ label: `Base URL: ${config.baseUrl ?? "-"}`, value: "baseUrl" },
		{ label: `API: ${apiLabel(currentApi)}`, value: "api" },
		{ label: `API Key: ${config.apiKey ? "***" : "(none)"}`, value: "apiKey" },
		{ label: "Back", value: "back" },
	]);
	if (!field || field === "back") return;

	if (field === "api") {
		const api = await overlayMenu(
			ctx,
			"Select API",
			API_TYPES.map((value) => ({ label: apiLabel(value), value })),
			API_TYPES.indexOf(currentApi),
		);
		if (api) {
			config.api = api;
			ctx.ui.notify("API updated", "info");
		}
		return;
	}

	if (field === "apiKey") {
		const actions = config.apiKey
			? [
					{ label: "Keep current", value: "keep" },
					{ label: "Replace", value: "replace" },
					{ label: "Clear", value: "clear" },
				]
			: [
					{ label: "Set", value: "replace" },
					{ label: "Clear", value: "clear" },
				];
		const action = await overlayMenu(ctx, "API Key", actions);
		if (!action || action === "keep") return;
		if (action === "clear") {
			config.apiKey = undefined;
			ctx.ui.notify("API key cleared", "info");
			return;
		}
		const value = await overlayInput(ctx, "API Key", config.apiKey ? "paste replacement" : "MY_API_KEY", {
			mask: true,
			cleanSecret: true,
		});
		if (value !== undefined) {
			config.apiKey = value || undefined;
			ctx.ui.notify("API key updated", "info");
		}
		return;
	}

	const value = await overlayInput(ctx, "Base URL", config.baseUrl ?? "");
	if (value !== undefined) {
		config.baseUrl = value || undefined;
		ctx.ui.notify("Base URL updated", "info");
	}
}

async function manageModels(ctx, config, name) {
	const models = config.models ?? [];
	if (models.length === 0) {
		ctx.ui.notify("No models configured", "info");
		return;
	}
	const picked = await overlayMenu(ctx, `Models: ${name}`, [
		...models.map((model) => ({ label: modelSummary(model), value: model.id })),
		{ label: "Back", value: "__back" },
	]);
	if (!picked || picked === "__back") return;

	const index = models.findIndex((model) => model.id === picked);
	if (index < 0) return;
	const model = models[index];
	const action = await overlayMenu(ctx, modelSummary(model), [
		{ label: "Edit", value: "edit" },
		{ label: "Remove", value: "remove" },
		{ label: "Back", value: "back" },
	]);
	if (!action || action === "back") return;

	if (action === "remove") {
		if (await overlayConfirm(ctx, "Remove model?", `Delete "${model.name ?? model.id}"?`)) {
			models.splice(index, 1);
			ctx.ui.notify("Model removed", "info");
		}
		return manageModels(ctx, config, name);
	}
	await editModel(ctx, model);
	return manageModels(ctx, config, name);
}

async function addModelManually(ctx, config, name) {
	const rawId = await overlayInput(ctx, "Model ID (API name)", "llama3.1:8b");
	const id = rawId?.trim();
	if (!id) {
		ctx.ui.notify("Model ID required", "warning");
		return;
	}
	if (config.models?.some((model) => model.id.trim().toLowerCase() === id.toLowerCase())) {
		ctx.ui.notify(`Model "${id}" already exists`, "warning");
		return;
	}
	const displayName = await overlayInput(ctx, "Display name", id);
	const reasoning = await overlayConfirm(ctx, "Reasoning?", "Does this model support extended thinking?");
	const inputType = await overlayMenu(ctx, "Input types", [
		{ label: "Text only", value: "text" },
		{ label: "Text + Image", value: "image" },
	]);
	if (!inputType) return;
	const contextRaw = await overlayInput(ctx, "Context window (tokens)", "128000");
	const maxRaw = await overlayInput(ctx, "Max output tokens", "16384");

	config.models ??= [];
	config.models.push({
		id,
		name: displayName?.trim() || id,
		reasoning: reasoning ?? false,
		input: inputType === "image" ? ["text", "image"] : ["text"],
		contextWindow: Number.parseInt(contextRaw ?? "128000", 10) || 128000,
		maxTokens: Number.parseInt(maxRaw ?? "16384", 10) || 16384,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	});
	ctx.ui.notify(`Model "${displayName?.trim() || id}" added`, "info");
}

async function editModel(ctx, model) {
	while (true) {
		const field = await overlayMenu(ctx, `Edit ${model.name ?? model.id}`, [
			{ label: `ID: ${model.id}`, value: "id" },
			{ label: `Name: ${model.name ?? ""}`, value: "name" },
			{ label: `Reasoning: ${model.reasoning ? "enabled" : "disabled"}`, value: "reasoning" },
			{ label: `Input: ${(model.input ?? ["text"]).join(", ")}`, value: "input" },
			{ label: `Context window: ${model.contextWindow ?? ""}`, value: "context" },
			{ label: `Max tokens: ${model.maxTokens ?? ""}`, value: "max" },
			{ label: "Back", value: "back" },
		]);
		if (!field || field === "back") return;

		if (field === "id") {
			const value = await overlayInput(ctx, "Model ID", model.id);
			if (value) model.id = value;
		} else if (field === "name") {
			const value = await overlayInput(ctx, "Display name", model.name ?? model.id);
			if (value) model.name = value;
		} else if (field === "reasoning") {
			model.reasoning = !(model.reasoning ?? false);
			ctx.ui.notify(`Reasoning ${model.reasoning ? "enabled" : "disabled"}`, "info");
		} else if (field === "input") {
			const picked = await overlayMenu(ctx, "Input types", [
				{ label: "Text only", value: "text" },
				{ label: "Text + Image", value: "image" },
			]);
			if (picked) model.input = picked === "image" ? ["text", "image"] : ["text"];
		} else if (field === "context") {
			const value = await overlayInput(ctx, "Context window", String(model.contextWindow ?? "128000"));
			const parsed = Number.parseInt(value ?? "", 10);
			if (!Number.isNaN(parsed)) model.contextWindow = parsed;
		} else if (field === "max") {
			const value = await overlayInput(ctx, "Max tokens", String(model.maxTokens ?? "16384"));
			const parsed = Number.parseInt(value ?? "", 10);
			if (!Number.isNaN(parsed)) model.maxTokens = parsed;
		}
	}
}

async function discoverAndAdd(ctx, config, name) {
	try {
		const result = await discoverModels(config);
		providerEntry(name).discovery = {
			ok: true,
			url: result.url,
			message: `${result.models.length} model(s) found`,
			at: Date.now(),
		};
		if (result.models.length === 0) {
			ctx.ui.notify("No models discovered", "warning");
			return;
		}
		const existing = new Set((config.models ?? []).map((model) => model.id.trim().toLowerCase()));
		const selected = await overlayPickModels(ctx, `Discovered models: ${name}`, result.models, existing);
		if (!selected || selected.size === 0) {
			ctx.ui.notify(`Discovery checked ${result.models.length} model(s) via ${result.url}`, "info");
			return;
		}
		let added = 0;
		let skipped = 0;
		for (const model of result.models) {
			if (!selected.has(model.id)) continue;
			if (appendModel(config, model)) added++;
			else skipped++;
		}
		ctx.ui.notify(`Added ${added} model(s), skipped ${skipped} existing  |  source ${result.url}`, "info");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		providerEntry(name).discovery = { ok: false, message, at: Date.now() };
		ctx.ui.notify(`Discover failed: ${message}`, "warning");
	}
}

async function testDiscovery(ctx, config, name) {
	try {
		const result = await discoverModels(config);
		providerEntry(name).discovery = {
			ok: true,
			url: result.url,
			message: `${result.models.length} model(s) found`,
			at: Date.now(),
		};
		const lines = [
			`Provider: ${name}`,
			`Endpoint: ${result.url}`,
			`Models: ${result.models.length}`,
			"",
			...result.models.slice(0, 80).map((model) => `- ${model.name} (${model.id})`),
		];
		if (result.models.length > 80) lines.push(`... ${result.models.length - 80} more`);
		ctx.ui.notify(`Discovery OK: ${result.models.length} model(s)`, "info");
		await overlayInfo(ctx, `Discovery OK: ${name}`, lines);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		providerEntry(name).discovery = { ok: false, message, at: Date.now() };
		ctx.ui.notify(`Discovery test failed: ${message}`, "warning");
		await overlayInfo(ctx, `Discovery failed: ${name}`, [`Provider: ${name}`, `Error: ${message}`]);
	}
}

async function testChat(ctx, config, name) {
	const models = config.models ?? [];
	if (models.length === 0) {
		ctx.ui.notify("Add a model before testing chat", "warning");
		return;
	}
	const modelId =
		models.length === 1
			? models[0].id
			: await overlayMenu(
					ctx,
					`Test chat: ${name}`,
					models.map((model) => ({ label: `${model.name ?? model.id} (${model.id})`, value: model.id })),
				);
	if (!modelId) return;

	try {
		const result = await sendChatTest(config, modelId);
		providerEntry(name).chat = {
			ok: true,
			url: result.url,
			model: modelId,
			message: result.preview || "OK (empty response)",
			at: Date.now(),
		};
		ctx.ui.notify(`Chat OK via ${result.url}: ${result.preview || "(empty response)"}`, "info");
		await overlayInfo(ctx, `Chat OK: ${name}`, [
			`Endpoint: ${result.url}`,
			`Model: ${modelId}`,
			`Preview: ${result.preview || "(empty response)"}`,
			"",
			"Full response:",
			result.full,
		]);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		providerEntry(name).chat = { ok: false, model: modelId, message, at: Date.now() };
		ctx.ui.notify(`Chat test failed: ${message}`, "warning");
		await overlayInfo(ctx, `Chat failed: ${name}`, [`Model: ${modelId}`, `Error: ${message}`]);
	}
}

async function showHealth(ctx, name, config) {
	const health = providerHealth.get(name);
	await overlayInfo(
		ctx,
		`Provider health: ${name}`,
		[
			`Provider: ${name}`,
			`Base URL: ${config.baseUrl ?? "-"}`,
			`API: ${apiLabel(config.api ?? guessApi(config.baseUrl))}`,
			`Models configured: ${config.models?.length ?? 0}`,
			`API key: ${config.apiKey ? "set" : "not set"}`,
			"",
			`Discovery: ${statusIcon(health?.discovery)} ${health?.discovery?.message ?? "not checked"}`,
			health?.discovery?.url ? `Discovery endpoint: ${health.discovery.url}` : "",
			health?.discovery?.at ? `Discovery checked: ${new Date(health.discovery.at).toLocaleString()}` : "",
			"",
			`Chat: ${statusIcon(health?.chat)} ${health?.chat?.message ?? "not checked"}`,
			health?.chat?.url ? `Chat endpoint: ${health.chat.url}` : "",
			health?.chat?.model ? `Chat model: ${health.chat.model}` : "",
			health?.chat?.at ? `Chat checked: ${new Date(health.chat.at).toLocaleString()}` : "",
		].filter(Boolean),
	);
}

// ── entry ────────────────────────────────────────────────────────────

export default function setupProviders(pi) {
	pi.registerCommand("setup-custom-providers", {
		description: "Interactive wizard to manage custom providers and models",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Requires an interactive UI.", "error");
				return;
			}
			const data = loadModels();
			let running = true;
			while (running) running = await mainMenu(ctx, data);
			saveModels(data);
			registerProviders(pi, data);
			ctx.ui.notify("Saved. Providers registered — use /model.", "info");
		},
	});

	pi.on("session_start", (_event, ctx) => {
		if (ctx.hasUI) ctx.ui.notify("setup-providers ready — /setup-custom-providers", "info");
	});
}
