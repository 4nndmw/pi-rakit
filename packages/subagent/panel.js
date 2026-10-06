/**
 * Animated bordered panel used by the sub-agent tool renderers.
 */

import { visibleWidth } from "@earendil-works/pi-tui";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function wrapPlain(text, width) {
	if (width <= 0) return [String(text)];
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

export class SubagentPanel {
	constructor(theme) {
		this.theme = theme;
		this.frame = 0;
		this.title = "";
		this.body = [];
		this.note = "";
		this.tone = "accent";
		this.animate = false;
		this.onTick = undefined;
		this.timer = null;
	}

	set({ title, body, note = "", tone = "accent", animate = false, theme } = {}) {
		if (theme) this.theme = theme;
		this.title = title ?? "";
		this.body = Array.isArray(body) ? body : [String(body ?? "")];
		this.note = note;
		this.tone = tone;
		this.animate = Boolean(animate);
		if (this.animate) this.start();
		else this.stop();
		return this;
	}

	start() {
		if (this.timer) return;
		this.timer = setInterval(() => {
			this.frame = (this.frame + 1) % SPINNER_FRAMES.length;
			this.onTick?.();
		}, 120);
		this.timer.unref?.();
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	invalidate() {}

	render(width) {
		const theme = this.theme;
		const boxWidth = Math.max(16, Math.floor(width));
		const spinner = this.animate ? `${SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length]} ` : "";
		const label = `${spinner}${this.title}`;
		const rest = Math.max(0, boxWidth - visibleWidth(`╭─ ${label} `) - 1);
		const lines = [
			theme.fg("border", "╭─ ") + theme.fg(this.tone, label) + theme.fg("border", ` ${"─".repeat(rest)}╮`),
		];
		const contentWidth = Math.max(1, boxWidth - 4);
		const rows = this.body.length > 0 ? this.body.flatMap((row) => wrapPlain(row, contentWidth)) : [""];
		for (const row of rows) {
			const padded = row + " ".repeat(Math.max(0, contentWidth - visibleWidth(row)));
			lines.push(theme.fg("border", "│ ") + theme.fg("text", padded) + theme.fg("border", " │"));
		}
		if (this.note) {
			const note = wrapPlain(this.note, contentWidth)[0] ?? "";
			const padded = note + " ".repeat(Math.max(0, contentWidth - visibleWidth(note)));
			lines.push(theme.fg("border", "│ ") + theme.fg("dim", padded) + theme.fg("border", " │"));
		}
		lines.push(theme.fg("border", `╰${"─".repeat(boxWidth - 2)}╯`));
		return lines;
	}
}
