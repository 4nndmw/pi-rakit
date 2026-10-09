import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CustomEditor, VERSION } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const STATUS = "open-tui";
const PRIMARY_BLUE = "\x1b[38;5;33m";
const RESET_FG = "\x1b[39m";

function primaryBlue(value) {
	return `${PRIMARY_BLUE}${value}${RESET_FG}`;
}
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
			const theme = ctx.ui.theme;
			const paint = (value) => primaryBlue(value);
			const muted = (value) => theme.fg("muted", value);
			const dim = (value) => theme.fg("dim", value);
			const padRight = (value, target) => `${value}${" ".repeat(Math.max(0, target - visibleWidth(value)))}`;
			const center = (value, target) => {
				const remaining = Math.max(0, target - visibleWidth(value));
				return `${" ".repeat(Math.floor(remaining / 2))}${value}${" ".repeat(Math.ceil(remaining / 2))}`;
			};
			const boxed = (value) => `${paint("│")}${padRight(value, Math.max(0, width - 2))}${paint("│")}`;
			const border = (left, label, right) => {
				const text = label ? `─── ${label} ─────` : "";
				return paint(`${left}${text}${"─".repeat(Math.max(0, width - 2 - visibleWidth(text)))}${right}`);
			};

			const model = ctx.model?.id ?? "no-model";
			const effort = pi.getThinkingLevel?.() ?? "off";
			const cwd = ctx.cwd ?? process.cwd();
			if (width < 30) return [paint(`Pi v${VERSION ?? "0.84.4"}`)];
			const inner = width - 2;
			const rightWidth = Math.min(28, Math.max(20, Math.floor(inner * 0.2)));
			const leftWidth = Math.max(1, inner - rightWidth - 1);
			const logo = ["   ███", "   █  █", "  ████", "  █  █", "  ███ "].map((line) => paint(line));
			const left = [
				...logo.map((line) => center(line, leftWidth)),
				center(theme.bold("Let's build something great"), leftWidth),
				center(muted(`${model} · ${effort}`), leftWidth),
				center(dim(cwd), leftWidth),
			];
			const commands = [...(pi.getCommands?.() ?? [])]
				.map((command) => `/${command.name ?? command}`)
				.filter((command, index, all) => all.indexOf(command) === index)
				.filter((command) => command !== "/open-tui")
				.slice(0, 3);
			const tips = ["", theme.bold("Welcome"), muted("Ask Pi anything"), paint("─".repeat(Math.min(rightWidth, 22))), theme.bold("Commands"), "/open-tui", ...commands];
			const lines = [border("╭", `${paint("Pi")} v${VERSION ?? "0.84.4"}`, "╮")];
			for (let index = 0; index < Math.max(left.length, tips.length); index += 1) {
				const leftPart = padRight(left[index] ?? "", leftWidth);
				const rightPart = truncateToWidth(tips[index] ?? "", rightWidth, "…");
				lines.push(boxed(`${leftPart}${paint("│")} ${padRight(rightPart, rightWidth)}`));
			}
			lines.push(border("╰", "", "╯"));
			return lines.map((line) => truncateToWidth(line, width, ""));
		},
	};
}

function createFooter(pi, tui, theme, footerData, ctx, config, startedAt) {
		const onBranch = footerData.onBranchChange(() => tui.requestRender());
		return {
			dispose: onBranch,
			invalidate() {},
			render(width) {
				const usage = usageTotals(ctx.sessionManager.getEntries?.() ?? []);
				const branch = footerData.getGitBranch?.() ?? "";
				const context = ctx.getContextUsage?.();
				const contextText = formatContextBar(context?.percent, width);
				const location = `${ctx.cwd ?? process.cwd()}${branch ? ` · ${branch}` : ""}`;
				const timer = startedAt.value ? ` · ${Math.round((Date.now() - startedAt.value) / 1000)}s` : "";
				const model = ctx.model?.id ?? "no-model";
				const effort = pi.getThinkingLevel?.() ?? "off";
				const left1 = `${icon(config, "⌂", "cwd")} ${location}`;
				const right1 = `${contextText}${timer}`;
				const left2 = `${model} · ${effort}`;
				const right2 = `${icon(config, "↑", "in")} ${formatNumber(usage.input)}  ${icon(config, "↓", "out")} ${formatNumber(usage.output)}  $${usage.cost.toFixed(3)}`;
				const fit = (left, right) => {
					const gap = Math.max(1, width - visibleWidth(left) - visibleWidth(right));
					return truncateToWidth(`${left}${" ".repeat(gap)}${right}`, width, "…");
				};
				return [theme.fg("dim", fit(left1, right1)), theme.fg("muted", fit(left2, right2))];
			},
		};
}

function formatContextBar(percent, width) {
	if (percent == null || !Number.isFinite(Number(percent))) return "ctx [?]";
	const value = Math.max(0, Math.min(100, Math.round(Number(percent))));
	const barWidth = width >= 100 ? 10 : width >= 60 ? 8 : 5;
	const filled = Math.round((value / 100) * barWidth);
	return `ctx [${"█".repeat(filled)}${"░".repeat(barWidth - filled)}] ${value}%`;
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
			const colored = primaryBlue(label);
			const labelWidth = visibleWidth(colored);
			return `${primaryBlue("──")}${colored}${primaryBlue("─".repeat(Math.max(0, width - labelWidth - 2)))}`;
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
		ctx.ui.setFooter((tui, theme, footerData) => createFooter(pi, tui, theme, footerData, ctx, config, startedAt));
		ctx.ui.setEditorComponent((tui, theme, keybindings) => new (createEditor(ctx, config))(tui, theme, keybindings));
		ctx.ui.setWorkingIndicator({
			frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
			intervalMs: 90,
		});
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





