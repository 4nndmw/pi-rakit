import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";

function textOf(content) {
	return typeof content === "string"
		? content
		: Array.isArray(content)
			? content
					.filter((x) => x?.type === "text")
					.map((x) => x.text)
					.join(" ")
			: "";
}
function shorten(value, size = 52) {
	const clean = value.replace(/\s+/g, " ").trim();
	return clean.length > size ? `${clean.slice(0, size - 1)}…` : clean;
}

export function describeSession(content, filename) {
	let name;
	let firstMessage;
	let timestamp;
	for (const line of content.split("\n")) {
		if (!line.trim()) continue;
		try {
			const entry = JSON.parse(line);
			if (entry.type === "session") timestamp = entry.timestamp;
			if (entry.type === "session_info" && entry.name) name = entry.name;
			if (
				!firstMessage &&
				entry.type === "message" &&
				entry.message?.role === "user"
			)
				firstMessage = textOf(entry.message.content);
		} catch {
			/* Ignore incomplete lines. */
		}
	}
	const title = shorten(name || firstMessage || filename);
	const date = timestamp
		? new Date(timestamp).toLocaleDateString()
		: "unknown date";
	return `${title} — ${date}`;
}

export async function listDeletableSessions(sessionDir, currentFile) {
	let names;
	try {
		names = await readdir(sessionDir);
	} catch {
		return [];
	}
	const current = currentFile ? path.resolve(currentFile) : undefined;
	const candidates = [];
	for (const name of names.filter((item) => item.endsWith(".jsonl")).sort()) {
		const file = path.resolve(sessionDir, name);
		if (file === current) continue;
		try {
			candidates.push({
				file,
				label: describeSession(await readFile(file, "utf8"), name),
			});
		} catch {
			/* File disappeared while listing. */
		}
	}
	return candidates;
}

export function isInside(directory, file) {
	const relative = path.relative(path.resolve(directory), path.resolve(file));
	return (
		relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
	);
}

export default function sessionDeleteExtension(pi) {
	pi.registerCommand("session-delete", {
		description:
			"Interactively delete a saved session (never the active session)",
		async handler(_args, ctx) {
			if (!ctx.hasUI) {
				ctx.ui.notify("Session deletion requires interactive mode.", "warning");
				return;
			}
			const directory = ctx.sessionManager.getSessionDir();
			const current = ctx.sessionManager.getSessionFile();
			const sessions = await listDeletableSessions(directory, current);
			if (!sessions.length) {
				ctx.ui.notify("No inactive sessions available to delete.", "info");
				return;
			}
			const labels = sessions.map(
				(item, index) => `${index + 1}. ${item.label}`,
			);
			const selected = await ctx.ui.select("Delete saved session", labels);
			if (!selected) return;
			const candidate = sessions[labels.indexOf(selected)];
			if (
				!candidate ||
				!isInside(directory, candidate.file) ||
				path.resolve(candidate.file) === path.resolve(current ?? "")
			) {
				ctx.ui.notify("Refusing to delete an unsafe or active path.", "error");
				return;
			}
			const confirmed = await ctx.ui.confirm(
				"Delete session permanently?",
				candidate.label,
			);
			if (!confirmed) return;
			try {
				await unlink(candidate.file);
				ctx.ui.notify(`Deleted: ${candidate.label}`, "info");
			} catch (error) {
				ctx.ui.notify(`Could not delete session: ${error.message}`, "error");
			}
		},
	});
}
