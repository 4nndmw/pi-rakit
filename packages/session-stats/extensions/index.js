const STATUS_KEY = "session-stats";

export function formatDuration(milliseconds) {
	const seconds = Math.max(0, Math.floor(milliseconds / 1000));
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const rest = seconds % 60;
	return hours
		? `${hours}h ${minutes}m`
		: minutes
			? `${minutes}m ${rest}s`
			: `${rest}s`;
}

export function countsFromEntries(entries) {
	const counts = { prompts: 0, turns: 0, tools: 0 };
	for (const entry of entries) {
		if (entry?.type !== "message") continue;
		if (entry.message?.role === "user") counts.prompts++;
		if (entry.message?.role === "assistant") {
			counts.turns++;
			for (const item of entry.message.content ?? [])
				if (item?.type === "toolCall") counts.tools++;
		}
	}
	return counts;
}

export class SessionStats {
	constructor(now = Date.now) {
		this.now = now;
		this.startedAt = now();
		this.counts = { prompts: 0, turns: 0, tools: 0 };
	}
	load(entries, timestamp) {
		this.counts = countsFromEntries(entries);
		const parsed = Date.parse(timestamp ?? "");
		this.startedAt = Number.isFinite(parsed) ? parsed : this.now();
	}
	text() {
		return `${formatDuration(this.now() - this.startedAt)} · ${this.counts.prompts}p ${this.counts.turns}t ${this.counts.tools} tools`;
	}
}

export default function sessionStatsExtension(pi) {
	const stats = new SessionStats();
	let timer;
	const render = (ctx) => ctx.ui.setStatus(STATUS_KEY, stats.text());
	pi.on("session_start", (_event, ctx) => {
		stats.load(
			ctx.sessionManager.getEntries(),
			ctx.sessionManager.getHeader()?.timestamp,
		);
		clearInterval(timer);
		render(ctx);
		timer = setInterval(() => render(ctx), 1000);
		timer.unref?.();
	});
	pi.on("before_agent_start", (_event, ctx) => {
		stats.counts.prompts++;
		render(ctx);
	});
	pi.on("turn_end", (_event, ctx) => {
		stats.counts.turns++;
		render(ctx);
	});
	pi.on("tool_execution_start", (_event, ctx) => {
		stats.counts.tools++;
		render(ctx);
	});
	pi.on("session_shutdown", (_event, ctx) => {
		clearInterval(timer);
		timer = undefined;
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});
	pi.registerCommand("session-stats", {
		description: "Show elapsed time, prompts, turns, and tool calls",
		handler: async (_args, ctx) => ctx.ui.notify(stats.text(), "info"),
	});
}
