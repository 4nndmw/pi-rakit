import {
	createBashTool,
	createEditTool,
	createFindTool,
	createGrepTool,
	createLsTool,
	createReadTool,
	createWriteTool,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

export function truncate(value, length = 72) {
	const text = String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export function summarizeResult(result) {
	const text = (result.content ?? [])
		.filter((item) => item?.type === "text")
		.map((item) => item.text)
		.join("\n");
	const lines = text ? text.split("\n").length : 0;
	const error = /^error\b/i.test(text.trim());
	return { text, lines, error };
}

function callLabel(name, args) {
	if (name === "bash") return `$ ${truncate(args.command)}`;
	const target = args.path ?? args.pattern ?? args.query ?? ".";
	if (name === "write" && typeof args.content === "string") {
		return `write ${truncate(target, 52)} (${args.content.split("\n").length} lines)`;
	}
	return `${name} ${truncate(target)}`;
}

function compactDefinition(name, original) {
	return {
		name,
		label: name,
		description: original.description,
		parameters: original.parameters,
		...(name === "edit" ? { renderShell: "self" } : {}),
		async execute(toolCallId, params, signal, onUpdate) {
			return original.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			return new Text(
				theme.fg("toolTitle", theme.bold(callLabel(name, args))),
				0,
				0,
			);
		},
		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) return new Text(theme.fg("warning", "running…"), 0, 0);
			const summary = summarizeResult(result);
			let text = theme.fg(
				summary.error ? "error" : "success",
				summary.error ? truncate(summary.text.split("\n")[0]) : "done",
			);
			if (!summary.error)
				text += theme.fg(
					"dim",
					` · ${summary.lines} line${summary.lines === 1 ? "" : "s"}`,
				);
			if (expanded && summary.text) {
				const lines = summary.text.split("\n");
				for (const line of lines.slice(0, 20))
					text += `\n${theme.fg("dim", line)}`;
				if (lines.length > 20)
					text += `\n${theme.fg("muted", `… ${lines.length - 20} more lines`)}`;
			}
			return new Text(text, 0, 0);
		},
	};
}

export default function compactToolsExtension(pi) {
	const cwd = process.cwd();
	const tools = {
		read: createReadTool(cwd),
		bash: createBashTool(cwd),
		edit: createEditTool(cwd),
		write: createWriteTool(cwd),
		grep: createGrepTool(cwd),
		find: createFindTool(cwd),
		ls: createLsTool(cwd),
	};
	for (const [name, tool] of Object.entries(tools))
		pi.registerTool(compactDefinition(name, tool));
}
