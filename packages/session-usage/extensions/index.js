import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { matchesKey, visibleWidth } from "@earendil-works/pi-tui";

const STATUS_KEY = "session-usage";
const FIELDS = ["input", "output", "cacheRead", "cacheWrite"];

export function emptyUsage() {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
}

export function usageTotals(usage = {}) {
	const totals = emptyUsage();
	for (const field of FIELDS) totals[field] += Number(usage[field]) || 0;
	if (typeof usage.cost === "number") totals.cost += usage.cost;
	else if (usage.cost && typeof usage.cost.total === "number") {
		totals.cost += usage.cost.total;
	}
	return totals;
}

export function addUsage(target, value) {
	for (const field of [...FIELDS, "cost"]) target[field] += value?.[field] || 0;
	return target;
}

function isAssistant(entry) {
	return entry?.type === "message" && entry.message?.role === "assistant";
}

export function collectUsage(entries) {
	const total = emptyUsage();
	for (const entry of entries) {
		if (!isAssistant(entry)) continue;
		addUsage(total, usageTotals(entry.message.usage));
	}
	return total;
}

function parseEntries(content) {
	const entries = [];
	for (const line of content.split("\n")) {
		if (!line.trim()) continue;
		try {
			entries.push(JSON.parse(line));
		} catch {
			/* Ignore an incomplete trailing line. */
		}
	}
	return entries;
}

export function parseSessionUsage(content) {
	return collectUsage(parseEntries(content));
}

function bump(map, key, totals) {
	const current = map.get(key) ?? emptyUsage();
	addUsage(current, totals);
	map.set(key, current);
}

function modelKey(message) {
	const provider = message.provider ? String(message.provider) : "";
	const model = String(message.responseModel ?? message.model ?? "unknown");
	return provider ? `${provider}/${model}` : model;
}

function dayKey(entry, message) {
	if (typeof entry?.timestamp === "string" && entry.timestamp.length >= 10) {
		return entry.timestamp.slice(0, 10);
	}
	if (typeof message?.timestamp === "number") {
		return new Date(message.timestamp).toISOString().slice(0, 10);
	}
	return "unknown";
}

export function aggregateEntries(entries) {
	const usage = emptyUsage();
	const byModel = new Map();
	const byDay = new Map();
	for (const entry of entries) {
		if (!isAssistant(entry)) continue;
		const totals = usageTotals(entry.message.usage);
		addUsage(usage, totals);
		bump(byModel, modelKey(entry.message), totals);
		bump(byDay, dayKey(entry, entry.message), totals);
	}
	return { usage, byModel, byDay };
}

export function summarizeSession(content) {
	const entries = parseEntries(content);
	const header = entries.find((entry) => entry?.type === "session") ?? null;
	return {
		id: header?.id ?? "unknown",
		startedAt: header?.timestamp ?? null,
		...aggregateEntries(entries),
	};
}

export async function collectProjectReport(sessionDir) {
	const sessions = [];
	const usage = emptyUsage();
	const byModel = new Map();
	const byDay = new Map();
	let files = [];
	try {
		files = (await readdir(sessionDir)).filter((name) => name.endsWith(".jsonl"));
	} catch {
		return { sessions, usage, byModel, byDay };
	}
	const summaries = await Promise.all(
		files.map(async (name) => {
			try {
				const summary = summarizeSession(
					await readFile(path.join(sessionDir, name), "utf8"),
				);
				summary.file = name;
				return summary;
			} catch {
				return null;
			}
		}),
	);
	for (const summary of summaries) {
		if (!summary) continue;
		sessions.push(summary);
		addUsage(usage, summary.usage);
		for (const [key, value] of summary.byModel) bump(byModel, key, value);
		for (const [day, value] of summary.byDay) bump(byDay, day, value);
	}
	return { sessions, usage, byModel, byDay };
}

export async function collectProjectUsage(sessionDir) {
	const report = await collectProjectReport(sessionDir);
	return { sessions: report.sessions.length, usage: report.usage };
}

export function formatNumber(value) {
	return new Intl.NumberFormat("en-US", {
		notation: value >= 10000 ? "compact" : "standard",
		maximumFractionDigits: 1,
	}).format(value);
}

export function formatCost(value) {
	return `$${(Number(value) || 0).toFixed(4)}`;
}

export function cacheHitRate(usage) {
	const denominator = (usage?.cacheRead ?? 0) + (usage?.input ?? 0);
	if (denominator <= 0) return 0;
	return usage.cacheRead / denominator;
}

export function formatUsage(usage) {
	const cached = usage.cacheRead + usage.cacheWrite;
	return `in ${formatNumber(usage.input)} · out ${formatNumber(usage.output)} · cache ${formatNumber(cached)}${usage.cost ? ` · $${usage.cost.toFixed(4)}` : ""}`;
}

function tokenTotal(usage) {
	return usage.input + usage.output;
}

// ── overlay dashboard ────────────────────────────────────────────────

function padRight(text, width) {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function padLeft(text, width) {
	const value = String(text);
	return " ".repeat(Math.max(0, width - visibleWidth(value))) + value;
}

function wrapLine(text, width) {
	if (text === "") return [""];
	if (visibleWidth(text) <= width) return [text];
	const lines = [];
	let rest = text;
	while (visibleWidth(rest) > width) {
		let cut = Math.max(1, width);
		while (cut > 1 && visibleWidth(rest.slice(0, cut)) > width) cut--;
		lines.push(rest.slice(0, cut));
		rest = rest.slice(cut);
	}
	lines.push(rest);
	return lines;
}

function frame(theme, width, title, body, footer) {
	const inner = width - 2;
	const lines = [theme.fg("border", `╭${"─".repeat(inner)}╮`)];
	const titlePad = Math.max(1, Math.floor((inner - visibleWidth(title)) / 2));
	lines.push(
		theme.fg("border", "│") +
			padRight(" ".repeat(titlePad) + theme.bold(theme.fg("accent", title)), inner) +
			theme.fg("border", "│"),
	);
	lines.push(theme.fg("border", `├${"─".repeat(inner)}┤`));
	lines.push(theme.fg("border", "│") + padRight("", inner) + theme.fg("border", "│"));
	for (const row of body) {
		lines.push(
			theme.fg("border", "│") +
				padRight(row ? theme.fg("text", `  ${row}`) : "    ", inner) +
				theme.fg("border", "│"),
		);
	}
	lines.push(theme.fg("border", "│") + padRight("", inner) + theme.fg("border", "│"));
	if (footer) {
		const footerPad = Math.max(1, Math.floor((inner - visibleWidth(footer)) / 2));
		lines.push(
			theme.fg("border", "│") +
				padRight(" ".repeat(footerPad) + theme.fg("dim", footer), inner) +
				theme.fg("border", "│"),
		);
	}
	lines.push(theme.fg("border", `╰${"─".repeat(inner)}╯`));
	return lines;
}

function summaryLines(current, project) {
	const lines = [];
	const block = (label, usage, sessions) => {
		lines.push(`${label}${sessions != null ? `  —  ${sessions} session${sessions === 1 ? "" : "s"}` : ""}`);
		lines.push(`  input       ${formatNumber(usage.input)}`);
		lines.push(`  output      ${formatNumber(usage.output)}`);
		lines.push(
			`  cache       ${formatNumber(usage.cacheRead + usage.cacheWrite)}  (read ${formatNumber(usage.cacheRead)} / write ${formatNumber(usage.cacheWrite)})`,
		);
		lines.push(`  total       ${formatNumber(tokenTotal(usage))} tokens`);
		lines.push(`  cost        ${formatCost(usage.cost)}`);
		lines.push(`  cache hit   ${(cacheHitRate(usage) * 100).toFixed(1)}%`);
		lines.push("");
	};
	block("Current session", current);
	block("Project history", project.usage, project.sessions.length);
	return lines;
}

function modelLines(byModel) {
	const rows = [...byModel.entries()]
		.map(([key, usage]) => ({ key, usage, tokens: tokenTotal(usage) }))
		.sort((a, b) => b.tokens - a.tokens);
	if (rows.length === 0) return ["No assistant usage recorded yet."];
	const lines = [
		`${padRight("model", 34)}${padLeft("in", 10)}${padLeft("out", 10)}${padLeft("cache", 10)}${padLeft("cost", 12)}`,
		"─".repeat(76),
	];
	for (const row of rows.slice(0, 40)) {
		lines.push(
			`${padRight(row.key.slice(0, 33), 34)}${padLeft(formatNumber(row.usage.input), 10)}${padLeft(formatNumber(row.usage.output), 10)}${padLeft(formatNumber(row.usage.cacheRead + row.usage.cacheWrite), 10)}${padLeft(formatCost(row.usage.cost), 12)}`,
		);
	}
	return lines;
}

function dailyLines(byDay) {
	const rows = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
	if (rows.length === 0) return ["No assistant usage recorded yet."];
	const lines = [
		`${padRight("date", 14)}${padLeft("in", 10)}${padLeft("out", 10)}${padLeft("cache", 10)}${padLeft("cost", 12)}`,
		"─".repeat(56),
	];
	for (const [day, usage] of rows.slice(0, 30)) {
		lines.push(
			`${padRight(day, 14)}${padLeft(formatNumber(usage.input), 10)}${padLeft(formatNumber(usage.output), 10)}${padLeft(formatNumber(usage.cacheRead + usage.cacheWrite), 10)}${padLeft(formatCost(usage.cost), 12)}`,
		);
	}
	return lines;
}

function sessionLines(sessions) {
	const rows = [...sessions]
		.map((session) => ({ ...session, tokens: tokenTotal(session.usage) }))
		.sort((a, b) => b.tokens - a.tokens);
	if (rows.length === 0) return ["No saved sessions found."];
	const lines = [
		`${padRight("started", 18)}${padLeft("tokens", 10)}${padLeft("cost", 12)}  session`,
		"─".repeat(76),
	];
	for (const row of rows.slice(0, 30)) {
		const started = row.startedAt ? row.startedAt.replace("T", " ").slice(0, 16) : "unknown";
		lines.push(
			`${padRight(started, 18)}${padLeft(formatNumber(row.tokens), 10)}${padLeft(formatCost(row.usage.cost), 12)}  ${row.file ?? row.id}`,
		);
	}
	return lines;
}

async function openDashboard(ctx, tabs) {
	await ctx.ui.custom(
		(tui, theme, _keys, done) => {
			let tab = 0;
			let scroll = 0;
			const maxRows = 18;
			return {
				invalidate() {},
				handleInput(data) {
					if (matchesKey(data, "escape") || data.toLowerCase() === "q") {
						done();
						return;
					}
					if (matchesKey(data, "left")) {
						tab = (tab - 1 + tabs.length) % tabs.length;
						scroll = 0;
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "right") || matchesKey(data, "tab")) {
						tab = (tab + 1) % tabs.length;
						scroll = 0;
						tui.requestRender();
						return;
					}
					if (/^[1-9]$/.test(data) && Number(data) <= tabs.length) {
						tab = Number(data) - 1;
						scroll = 0;
						tui.requestRender();
						return;
					}
					const seleted = tabs[tab];
					const lineCount = seleted.lines.length;
					const maxScroll = Math.max(0, lineCount - maxRows);
					if (matchesKey(data, "up")) {
						scroll = Math.max(0, scroll - 1);
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "down")) {
						scroll = Math.min(maxScroll, scroll + 1);
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "pageup")) {
						scroll = Math.max(0, scroll - maxRows);
						tui.requestRender();
						return;
					}
					if (matchesKey(data, "pagedown")) {
						scroll = Math.min(maxScroll, scroll + maxRows);
						tui.requestRender();
					}
				},
				render(width) {
					const boxWidth = Math.min(96, width - 4);
					const textWidth = Math.max(20, boxWidth - 6);
					const body = tabs[tab].lines.flatMap((line) => wrapLine(line, textWidth));
					const maxScroll = Math.max(0, body.length - maxRows);
					scroll = Math.max(0, Math.min(scroll, maxScroll));
					const visible = body.slice(scroll, scroll + maxRows);
					const tabBar = tabs
						.map((item, index) =>
							index === tab
								? theme.fg("accent", `[${item.title}]`)
								: theme.fg("dim", ` ${item.title} `),
						)
						.join(" ");
					const lines = [tabBar, "", ...visible];
					return frame(theme, boxWidth, "Token Usage", lines, "←→ / 1-4 tabs  |  ↑↓ scroll  |  Q/Esc close");
				},
			};
		},
		{ overlay: true },
	);
}

function updateStatus(ctx) {
	const usage = collectUsage(ctx.sessionManager.getEntries());
	ctx.ui.setStatus(STATUS_KEY, `tokens ${formatNumber(usage.input + usage.output)}`);
}

export default function sessionUsageExtension(pi) {
	pi.on("session_start", (_event, ctx) => updateStatus(ctx));
	pi.on("message_end", (event, ctx) => {
		if (event.message.role === "assistant") updateStatus(ctx);
	});
	pi.on("session_shutdown", (_event, ctx) => ctx.ui.setStatus(STATUS_KEY, undefined));

	pi.registerCommand("usage", {
		description: "Show token usage for this session and project history",
		async handler(_args, ctx) {
			const current = collectUsage(ctx.sessionManager.getEntries());
			const project = await collectProjectUsage(ctx.sessionManager.getSessionDir());
			ctx.ui.notify(
				`Current: ${formatUsage(current)}\nProject (${project.sessions} sessions): ${formatUsage(project.usage)}`,
				"info",
			);
		},
	});

	pi.registerCommand("tokens", {
		description: "Open the token usage dashboard (summary, models, daily, sessions)",
		async handler(_args, ctx) {
			if (!ctx.hasUI) {
				ctx.ui.notify("The token dashboard requires an interactive UI.", "error");
				return;
			}
			const current = collectUsage(ctx.sessionManager.getEntries());
			const project = await collectProjectReport(ctx.sessionManager.getSessionDir());
			await openDashboard(ctx, [
				{ title: "Summary", lines: summaryLines(current, project) },
				{ title: "Models", lines: modelLines(project.byModel) },
				{ title: "Daily", lines: dailyLines(project.byDay) },
				{ title: "Sessions", lines: sessionLines(project.sessions) },
			]);
		},
	});
}
