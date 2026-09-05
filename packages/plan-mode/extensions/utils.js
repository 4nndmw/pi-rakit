const SIMPLE_READ_COMMANDS = new Set([
	"cat",
	"head",
	"tail",
	"grep",
	"rg",
	"ls",
	"pwd",
	"wc",
	"diff",
	"file",
	"stat",
	"du",
	"df",
	"tree",
	"which",
	"whereis",
	"type",
	"printenv",
	"uname",
	"whoami",
	"id",
	"uptime",
	"ps",
	"free",
	"jq",
	"bat",
	"eza",
	"fd",
]);

const SHELL_OPERATOR_PATTERN = /[\n\r;|&<>`]|\$\(|\$\{/;
const MUTATING_FIND_PATTERN = /(?:^|\s)-(?:delete|exec|execdir|ok|okdir|fls|fprint|fprint0|fprintf)(?:\s|$)/i;
const OUTPUT_FILE_PATTERN = /(?:^|\s)(?:-o\S*|--output(?:=|\s|$))/i;
const FD_EXEC_PATTERN = /(?:^|\s)(?:-[xX]\S*|--exec|--exec-batch)(?:=|\s|$)/;
const RG_EXEC_PATTERN = /(?:^|\s)--(?:pre|hostname-bin)(?:=|\s|$)/;
const BAT_PAGER_PATTERN = /(?:^|\s)(?:-P|--pager)(?:=|\s|$)/;
const GIT_EXEC_PATTERN = /(?:^|\s)--(?:ext-diff|textconv)(?:=|\s|$)/;

/**
 * Accept one conservatively allowlisted read-only shell command.
 * Shell composition, redirection, command substitution, and known write flags
 * are rejected rather than parsed.
 */
export function isSafeCommand(command) {
	if (typeof command !== "string") return false;
	const trimmed = command.trim();
	if (!trimmed || SHELL_OPERATOR_PATTERN.test(trimmed)) return false;

	const [program = "", ...args] = trimmed.split(/\s+/);
	if (program.includes("/") || program.includes("\\")) return false;
	const executable = program.toLowerCase();
	if (!executable) return false;

	if (SIMPLE_READ_COMMANDS.has(executable)) {
		if (executable === "fd") return !FD_EXEC_PATTERN.test(trimmed);
		if (executable === "rg") return !RG_EXEC_PATTERN.test(trimmed);
		if (executable === "bat") return !BAT_PAGER_PATTERN.test(trimmed);
		if (["diff", "tree"].includes(executable)) return !OUTPUT_FILE_PATTERN.test(trimmed);
		return true;
	}

	if (executable === "find") return !MUTATING_FIND_PATTERN.test(trimmed);
	if (executable === "sed") {
		return args.length >= 3 && args[0] === "-n" && /^['"]?\d+(?:,\d+)?p['"]?$/.test(args[1]) && args.slice(2).every((arg) => !arg.startsWith("-"));
	}
	if (executable === "date") return args.every((arg) => arg === "-u" || arg.startsWith("+"));
	if (executable === "env") return args.length === 0;
	if (["node", "python", "python3"].includes(executable)) {
		return args.length === 1 && ["--version", "-V"].includes(args[0]);
	}
	if (executable === "git") {
		const subcommand = args[0];
		if (["status", "log", "diff", "show"].includes(subcommand)) {
			const options = args.slice(1).join(" ");
			return !OUTPUT_FILE_PATTERN.test(options) && !GIT_EXEC_PATTERN.test(options);
		}
		if (subcommand === "branch") {
			const safeFlags = new Set([
				"-a",
				"--all",
				"-r",
				"--remotes",
				"-v",
				"-vv",
				"--verbose",
				"--list",
				"--show-current",
			]);
			return args.slice(1).every((arg) => safeFlags.has(arg));
		}
		if (subcommand === "remote") {
			return args.length === 1 || args.slice(1).every((arg) => arg === "-v");
		}
		if (subcommand === "config") {
			return ["--get", "--get-all", "--list"].includes(args[1]);
		}
		return ["ls-files", "ls-tree"].includes(subcommand);
	}
	return false;
}

export function cleanStepText(text) {
	let cleaned = text
		.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(
			/^(Use|Run|Execute|Create|Write|Read|Check|Verify|Update|Modify|Add|Remove|Delete|Install)\s+(the\s+)?/i,
			"",
		)
		.replace(/\s+/g, " ")
		.trim();

	if (cleaned) cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
	return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
}

export function extractTodoItems(message) {
	if (typeof message !== "string") return [];
	const header = /\*{0,2}Plan:\*{0,2}\s*\n/i.exec(message);
	if (!header) return [];

	const items = [];
	const planSection = message.slice(header.index + header[0].length);
	const numberedPattern = /^\s*(\d+)[.)]\s+(.+)$/gm;
	for (const match of planSection.matchAll(numberedPattern)) {
		const text = cleanStepText(match[2].trim());
		if (text.length > 3 && !text.startsWith("/") && !text.startsWith("-")) {
			items.push({ step: items.length + 1, text, completed: false });
		}
	}
	return items;
}

export function extractDoneSteps(message) {
	if (typeof message !== "string") return [];
	return [...message.matchAll(/\[DONE:(\d+)\]/gi)].map((match) => Number(match[1]));
}

export function markCompletedSteps(text, items) {
	let changed = 0;
	for (const step of new Set(extractDoneSteps(text))) {
		const item = items.find((candidate) => candidate.step === step);
		if (item && !item.completed) {
			item.completed = true;
			changed += 1;
		}
	}
	return changed;
}
