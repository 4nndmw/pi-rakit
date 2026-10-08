import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const STATUS = "open-tui";
const CONFIG_PATH = path.join(os.homedir(), ".pi", "agent", "open-tui.json");
const DEFAULTS = {
	enabled: true,
	inlineFooter: false,
	cursorStyle: "block",
	icons: "auto",
	telemetry: true,
};

export function mergeConfig(value = {}) {
	return { ...DEFAULTS, ...(value && typeof value === "object" ? value : {}) };
}

export async function loadConfig(file = CONFIG_PATH) {
	try {
		return mergeConfig(JSON.parse(await readFile(file, "utf8")));
	} catch {
		return { ...DEFAULTS };
	}
}

export async function saveConfig(config, file = CONFIG_PATH) {
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify(mergeConfig(config), null, 2)}\n`, "utf8");
}

function formatNumber(value) {
	return new Intl.NumberFormat("en-US", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function usageTotals(entries = []) {
	const result = { input: 0, output: 0, cache: 0, cost: 0 };
	for (const entry of entries) {
		if (entry?.type !== "message" || entry.message?.role !== "assistant") continue;
		const usage = entry.message.usage ?? {};
		result.input += Number(usage.input) || 0;
		result.output += Number(usage.output) || 0;
		result.cache += (Number(usage.cacheRead) || 0) + (Number(usage.cacheWrite) || 0);
		result.cost += Number(usage.cost?.total ?? usage.cost) || 0;
	}
	return result;
}

function icon(config, unicode, ascii) {
	return config.icons === "ascii" ? ascii : unicode;
}

function createHeader(pi, ctx, config) {
	return {
		invalidate() {},
		render(width) {
			const model = ctx.model?.id ?? "no-model";
			const effort = pi.getThinkingLevel?.() ?? "off";
			const cwd = ctx.cwd ?? process.cwd();
			const left = `${icon(config, "π", ">_")} Pi Open TUI`;
			const right = `${model} · ${effort} · ${cwd}`;
			if (width < 30) return [truncateToWidth(left, width, "")];
			const available = Math.max(0, width - visibleWidth(left) - 1);
			return [truncateToWidth(`${left}${" ".repeat(Math.max(1, available - visibleWidth(right)))}${right}`, width, "…")];
		},
	};
}

function createFooter(tui, theme, footerData, ctx, config, startedAt) {
		const onBranch = footerData.onBranchChange(() => tui.requestRender());
		return {
			dispose: onBranch,
			invalidate() {},
			render(width) {
				const usage = usageTotals(ctx.sessionManager.getEntries?.() ?? []);
				const branch = footerData.getGitBranch?.() ?? "";
				const context = ctx.getContextUsage?.();
				const contextText = context?.percent == null ? "ctx ?" : `ctx ${Math.round(context.percent)}%`;
				const location = `${ctx.cwd ?? process.cwd()}${branch ? ` · ${branch}` : ""}`;
				const timer = startedAt.value ? ` · ${Math.round((Date.now() - startedAt.value) / 1000)}s` : "";
				const line1 = `${icon(config, "⌂", "cwd")} ${location}`;
				const line2 = `${icon(config, "↑", "in")} ${formatNumber(usage.input)}  ${icon(config, "↓", "out")} ${formatNumber(usage.output)}  ${contextText}  $${usage.cost.toFixed(3)}${timer}`;
				return [theme.fg("dim", truncateToWidth(line1, width, "…")), theme.fg("muted", truncateToWidth(line2, width, "…"))];
			},
		};
}

function createEditor(ctx, config) {
	return class OpenTuiEditor extends CustomEditor {
		constructor(tui, theme, keybindings) {
			super(tui, theme, keybindings, { paddingX: 1, embedWorkingStatus: true });
		}

		renderBottomBorder(width, hiddenLineCount) {
			const base = super.renderBottomBorder(width, hiddenLineCount);
			if (config.inlineFooter || hiddenLineCount > 0 || width < 20) return base;
			const label = ctx.isIdle() ? " READY " : " WORKING ";
			const colored = ctx.ui.theme.fg(ctx.isIdle() ? "success" : "accent", label);
			const labelWidth = visibleWidth(colored);
			return `${this.borderColor("──")}${colored}${this.borderColor("─".repeat(Math.max(0, width - labelWidth - 2)))}`;
		}
	};
}

export default function openTuiExtension(pi) {
	let config = { ...DEFAULTS };
	let active;
	const startedAt = { value: undefined };
	const apply = (ctx) => {
		if (ctx.mode !== "tui" || !config.enabled) return;
		active = ctx;
		ctx.ui.setHeader(() => createHeader(pi, ctx, config));
		ctx.ui.setFooter((tui, theme, footerData) => createFooter(tui, theme, footerData, ctx, config, startedAt));
		ctx.ui.setEditorComponent((tui, theme, keybindings) => new (createEditor(ctx, config))(tui, theme, keybindings));
		ctx.ui.setWorkingIndicator({ frames: ["·", "•", "●", "•"], intervalMs: 120 });
	};

	pi.on("session_start", async (_event, ctx) => { config = await loadConfig(); apply(ctx); });
	pi.on("turn_start", (_event, ctx) => { startedAt.value = Date.now(); ctx.ui.setStatus(STATUS, config.telemetry ? "working" : undefined); });
	pi.on("turn_end", (_event, ctx) => { if (startedAt.value && config.telemetry) ctx.ui.setStatus(STATUS, `done ${Math.round((Date.now() - startedAt.value) / 1000)}s`); startedAt.value = undefined; });
	pi.on("session_shutdown", (_event, ctx) => { ctx.ui.setStatus(STATUS, undefined); active = undefined; });

	pi.registerCommand("open-tui", {
		description: "Configure the Pi Open TUI (on, off, status, reset)",
		async handler(args, ctx) {
			const action = args.trim().toLowerCase();
			if (action === "on" || action === "off") {
				config = { ...config, enabled: action === "on" };
				await saveConfig(config);
				if (config.enabled) apply(ctx);
				ctx.ui.notify(`Pi Open TUI ${config.enabled ? "enabled" : "disabled"}`, "info");
				return;
			}
			if (action === "reset") { config = { ...DEFAULTS }; await saveConfig(config); ctx.ui.notify("Pi Open TUI settings reset", "info"); return; }
			ctx.ui.notify(`Pi Open TUI: ${config.enabled ? "on" : "off"} · cursor ${config.cursorStyle} · icons ${config.icons}`, "info");
		},
	});
}
