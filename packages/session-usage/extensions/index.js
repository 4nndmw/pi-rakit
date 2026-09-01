import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const STATUS_KEY = "session-usage";
const FIELDS = ["input", "output", "cacheRead", "cacheWrite"];

export function emptyUsage() {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
}

export function collectUsage(entries) {
	const total = emptyUsage();
	for (const entry of entries) {
		if (entry?.type !== "message" || entry.message?.role !== "assistant")
			continue;
		const usage = entry.message.usage ?? {};
		for (const field of FIELDS) total[field] += Number(usage[field]) || 0;
		if (typeof usage.cost === "number") total.cost += usage.cost;
		else if (usage.cost && typeof usage.cost.total === "number")
			total.cost += usage.cost.total;
	}
	return total;
}

export function parseSessionUsage(content) {
	const entries = [];
	for (const line of content.split("\n")) {
		if (!line.trim()) continue;
		try {
			entries.push(JSON.parse(line));
		} catch {
			/* Ignore an incomplete trailing line. */
		}
	}
	return collectUsage(entries);
}

export function addUsage(target, value) {
	for (const field of [...FIELDS, "cost"]) target[field] += value[field] || 0;
	return target;
}

export function formatNumber(value) {
	return new Intl.NumberFormat("en-US", {
		notation: value >= 10000 ? "compact" : "standard",
		maximumFractionDigits: 1,
	}).format(value);
}

export function formatUsage(usage) {
	const cached = usage.cacheRead + usage.cacheWrite;
	return `in ${formatNumber(usage.input)} · out ${formatNumber(usage.output)} · cache ${formatNumber(cached)}${usage.cost ? ` · $${usage.cost.toFixed(4)}` : ""}`;
}

export async function collectProjectUsage(sessionDir) {
	const total = emptyUsage();
	let files = [];
	try {
		files = (await readdir(sessionDir)).filter((name) =>
			name.endsWith(".jsonl"),
		);
	} catch {
		return { sessions: 0, usage: total };
	}
	const values = await Promise.all(
		files.map(async (name) => {
			try {
				return parseSessionUsage(
					await readFile(path.join(sessionDir, name), "utf8"),
				);
			} catch {
				return emptyUsage();
			}
		}),
	);
	for (const value of values) addUsage(total, value);
	return { sessions: files.length, usage: total };
}

function updateStatus(ctx) {
	const usage = collectUsage(ctx.sessionManager.getEntries());
	ctx.ui.setStatus(
		STATUS_KEY,
		`tokens ${formatNumber(usage.input + usage.output)}`,
	);
}

export default function sessionUsageExtension(pi) {
	pi.on("session_start", (_event, ctx) => updateStatus(ctx));
	pi.on("message_end", (event, ctx) => {
		if (event.message.role === "assistant") updateStatus(ctx);
	});
	pi.on("session_shutdown", (_event, ctx) =>
		ctx.ui.setStatus(STATUS_KEY, undefined),
	);
	pi.registerCommand("usage", {
		description: "Show token usage for this session and project history",
		async handler(_args, ctx) {
			const current = collectUsage(ctx.sessionManager.getEntries());
			const project = await collectProjectUsage(
				ctx.sessionManager.getSessionDir(),
			);
			ctx.ui.notify(
				`Current: ${formatUsage(current)}\nProject (${project.sessions} sessions): ${formatUsage(project.usage)}`,
				"info",
			);
		},
	});
}
