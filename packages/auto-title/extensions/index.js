function messageText(content) {
	return typeof content === "string"
		? content
		: Array.isArray(content)
			? content
					.filter((part) => part?.type === "text")
					.map((part) => part.text)
					.join(" ")
			: "";
}

export function createSessionTitle(prompt, maxLength = 56) {
	const text = String(prompt ?? "")
		.replace(/```[\s\S]*?```/g, " code ")
		.replace(/^\s*\/[\w-]+\s*/, "")
		.replace(/[#>*_`~]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!text) return undefined;
	const sentence = text.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, "");
	const words = sentence.split(" ").slice(0, 9).join(" ");
	if (words.length <= maxLength) return words;
	return `${words.slice(0, maxLength - 1).trimEnd()}…`;
}

function firstPrompt(entries) {
	for (const entry of entries)
		if (entry?.type === "message" && entry.message?.role === "user")
			return messageText(entry.message.content);
}

export default function autoTitleExtension(pi) {
	const apply = (prompt) => {
		if (pi.getSessionName()) return;
		const title = createSessionTitle(prompt);
		if (title) pi.setSessionName(title);
	};
	pi.on("session_start", (_event, ctx) =>
		apply(firstPrompt(ctx.sessionManager.getEntries())),
	);
	pi.on("before_agent_start", (event) => apply(event.prompt));
}
