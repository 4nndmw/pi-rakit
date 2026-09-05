import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const THEME_NAME = "rakit";
const INDICATOR = {
	frames: ["\u001b[38;2;112;215;231m·\u001b[39m", "\u001b[38;2;122;162;247m•\u001b[39m", "\u001b[38;2;187;154;247m●\u001b[39m", "\u001b[38;2;122;162;247m•\u001b[39m"],
	intervalMs: 120,
};

export function formatMetric(value) {
	const number = Number(value) || 0;
	if (number < 1000) return String(Math.round(number));
	if (number < 1_000_000) return `${(number / 1000).toFixed(number < 10_000 ? 1 : 0)}k`;
	return `${(number / 1_000_000).toFixed(1)}m`;
}

export function collectUsage(entries = []) {
	let input = 0;
	let output = 0;
	let cost = 0;
	for (const entry of entries) {
		if (entry?.type !== "message" || entry.message?.role !== "assistant") continue;
		const usage = entry.message.usage ?? {};
		input += Number(usage.input) || 0;
		output += Number(usage.output) || 0;
		cost += Number(usage.cost?.total) || 0;
	}
	return { input, output, cost };
}

export function compactPath(cwd, home = process.env.HOME) {
	if (home && (cwd === home || cwd.startsWith(`${home}/`))) return `~${cwd.slice(home.length)}`;
	return cwd;
}

function cleanStatus(text) {
	return String(text ?? "").replace(/\s+/g, " ").trim();
}

export function fitSides(left, right, width, gap = 2) {
	if (width <= 0) return "";
	if (!right) return truncateToWidth(left, width, "");
	const leftWidth = visibleWidth(left);
	const rightWidth = visibleWidth(right);
	if (leftWidth + gap + rightWidth <= width) {
		return `${left}${" ".repeat(width - leftWidth - rightWidth)}${right}`;
	}
	const reservedRight = Math.min(rightWidth, Math.max(1, Math.floor((width - gap) / 2)));
	const rightText = truncateToWidth(right, reservedRight, "");
	const leftText = truncateToWidth(left, Math.max(0, width - gap - visibleWidth(rightText)), "");
	return `${leftText}${" ".repeat(Math.max(0, width - visibleWidth(leftText) - visibleWidth(rightText)))}${rightText}`;
}

export function createHeader(theme) {
	return {
		invalidate() {},
		render(width) {
			if (width <= 0) return [];
			const mark = theme.bold(theme.fg("accent", "◆"));
			const name = theme.bold(theme.fg("text", " PI RAKIT"));
			const ruleWidth = Math.max(0, width - visibleWidth(`${mark}${name}`) - 1);
			const line = `${mark}${name} ${theme.fg("borderMuted", "─".repeat(ruleWidth))}`;
			if (width < 28) return [truncateToWidth(line, width, "")];
			return [truncateToWidth(line, width, ""), theme.fg("dim", "  build · inspect · ship")];
		},
	};
}

export function createFooter(tui, theme, footerData, ctx, getThinkingLevel = () => undefined) {
	const unsubscribe = footerData.onBranchChange(() => tui.requestRender());
	return {
		dispose: unsubscribe,
		invalidate() {},
		render(width) {
			if (width <= 0) return [];
			const usage = collectUsage(ctx.sessionManager.getBranch?.() ?? ctx.sessionManager.getEntries());
			const context = ctx.getContextUsage?.();
			const branch = footerData.getGitBranch();
			const model = ctx.model?.id ?? "no-model";
			const stats = `↑${formatMetric(usage.input)} ↓${formatMetric(usage.output)} $${usage.cost.toFixed(3)}`;
			const contextText = context?.percent == null ? "ctx ?" : `ctx ${Math.round(context.percent)}%`;
			const location = `${compactPath(ctx.cwd)}${branch ? ` · ${branch}` : ""}`;
			const thinkingLevel = getThinkingLevel();
			const lines = [
				theme.fg("dim", fitSides(location, `${model} · ${contextText}`, width)),
				theme.fg("muted", fitSides(stats, thinkingLevel ? `thinking ${thinkingLevel}` : "", width)),
			];
			const statuses = [...footerData.getExtensionStatuses().entries()]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([, text]) => cleanStatus(text))
				.filter(Boolean)
				.join(" ");
			if (statuses) lines.push(truncateToWidth(statuses, width, theme.fg("dim", "…")));
			return lines;
		},
	};
}

export function createRakitEditorClass(ctx) {
	return class RakitEditor extends CustomEditor {
		constructor(tui, theme, keybindings) {
			super(tui, theme, keybindings, { paddingX: 1, embedWorkingStatus: true });
		}

		render(width) {
			const lines = super.render(width);
			if (width <= 0 || lines.length < 2) return lines;
			const label = ctx.isIdle() ? " READY " : " WORKING ";
			const colored = ctx.ui.theme.fg(ctx.isIdle() ? "success" : "accent", label);
			const labelWidth = visibleWidth(colored);
			if (width >= labelWidth + 4) {
				lines[lines.length - 1] = `${this.borderColor("──")}${colored}${this.borderColor("─".repeat(Math.max(0, width - labelWidth - 2)))}`;
			}
			return lines;
		}
	};
}

export default function rakitUiExtension(pi) {
	let enabled = true;
	let activeContext;
	let previousTheme;
	let previousEditor;

	const restore = (ctx) => {
		ctx.ui.setHeader(undefined);
		ctx.ui.setFooter(undefined);
		ctx.ui.setEditorComponent(previousEditor);
		ctx.ui.setWorkingIndicator();
		if (previousTheme) ctx.ui.setTheme(previousTheme);
	};

	const apply = (ctx, capture = false) => {
		if (ctx.mode !== "tui") return;
		activeContext = ctx;
		if (capture) {
			previousTheme = ctx.ui.theme;
			previousEditor = ctx.ui.getEditorComponent();
		}
		ctx.ui.setTheme(THEME_NAME);
		ctx.ui.setHeader((_tui, theme) => createHeader(theme));
		ctx.ui.setFooter((tui, theme, footerData) => createFooter(tui, theme, footerData, ctx, () => pi.getThinkingLevel()));
		const Editor = createRakitEditorClass(ctx);
		ctx.ui.setEditorComponent((tui, theme, keybindings) => new Editor(tui, theme, keybindings));
		ctx.ui.setWorkingIndicator(INDICATOR);
	};

	pi.on("session_start", (_event, ctx) => {
		if (enabled) apply(ctx, true);
	});
	pi.on("session_shutdown", (_event, ctx) => {
		if (enabled && ctx.mode === "tui") restore(ctx);
		activeContext = undefined;
	});

	pi.registerCommand("rakit-ui", {
		description: "Control the Pi Rakit global UI: on, off, or theme",
		handler(args, ctx) {
			const action = args.trim().toLowerCase();
			if (!action) {
				ctx.ui.notify(`Pi Rakit UI: ${enabled ? "on" : "off"}`, "info");
				return;
			}
			if (action === "on") {
				if (!enabled) {
					enabled = true;
					apply(ctx, true);
				}
				ctx.ui.notify("Pi Rakit UI enabled", "info");
				return;
			}
			if (action === "off") {
				if (enabled && ctx.mode === "tui") restore(ctx);
				enabled = false;
				ctx.ui.notify("Pi Rakit UI disabled", "info");
				return;
			}
			if (action === "theme") {
				const result = ctx.ui.setTheme(THEME_NAME);
				ctx.ui.notify(result.success ? "Rakit theme applied" : `Rakit theme unavailable: ${result.error}`, result.success ? "info" : "error");
				return;
			}
			ctx.ui.notify("Usage: /rakit-ui [on|off|theme]", "error");
		},
	});
}
