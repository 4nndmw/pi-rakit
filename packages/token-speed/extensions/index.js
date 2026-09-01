const STATUS_KEY = "token-speed";
const MIN_SAMPLE_MS = 100;
const UPDATE_INTERVAL_MS = 100;

export function estimateTokens(text) {
	if (!text) return 0;
	return Math.max(1, Math.ceil([...text].length / 4));
}

export function formatTokenSpeed(tokensPerSecond, estimated = false) {
	const value =
		tokensPerSecond < 100
			? tokensPerSecond.toFixed(1)
			: Math.round(tokensPerSecond).toString();
	return `⚡ ${estimated ? "~" : ""}${value} tok/s`;
}

export class TokenSpeedTracker {
	constructor(options = {}) {
		this.now = options.now ?? Date.now;
		this.startedAt = undefined;
		this.estimatedTokens = 0;
		this.lastUpdateAt = undefined;
	}

	reset(ui) {
		this.startedAt = undefined;
		this.estimatedTokens = 0;
		this.lastUpdateAt = undefined;
		ui.setStatus(STATUS_KEY, undefined);
	}

	record(delta, ui) {
		const now = this.now();
		if (this.startedAt === undefined) this.startedAt = now;
		this.estimatedTokens += estimateTokens(delta);

		const elapsedMs = now - this.startedAt;
		if (elapsedMs < MIN_SAMPLE_MS) return;
		if (
			this.lastUpdateAt !== undefined &&
			now - this.lastUpdateAt < UPDATE_INTERVAL_MS
		)
			return;

		this.lastUpdateAt = now;
		ui.setStatus(
			STATUS_KEY,
			formatTokenSpeed(this.estimatedTokens / (elapsedMs / 1000), true),
		);
	}

	finish(outputTokens, ui) {
		if (this.startedAt === undefined) return;
		const elapsedMs = this.now() - this.startedAt;
		if (elapsedMs <= 0) return;
		const tokens =
			Number.isFinite(outputTokens) && outputTokens >= 0
				? outputTokens
				: this.estimatedTokens;
		ui.setStatus(
			STATUS_KEY,
			formatTokenSpeed(tokens / (elapsedMs / 1000), outputTokens === undefined),
		);
	}
}

export default function tokenSpeedExtension(pi) {
	const tracker = new TokenSpeedTracker();

	pi.on("message_start", (event, ctx) => {
		if (event.message.role === "assistant") tracker.reset(ctx.ui);
	});

	pi.on("message_update", (event, ctx) => {
		const update = event.assistantMessageEvent;
		if (
			update.type === "text_delta" ||
			update.type === "thinking_delta" ||
			update.type === "toolcall_delta"
		) {
			tracker.record(update.delta, ctx.ui);
		}
	});

	pi.on("message_end", (event, ctx) => {
		if (event.message.role === "assistant") {
			tracker.finish(event.message.usage?.output, ctx.ui);
		}
	});

	pi.on("session_shutdown", (_event, ctx) => {
		tracker.reset(ctx.ui);
	});
}
