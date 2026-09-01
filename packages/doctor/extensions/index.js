import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const STATUS_LABELS = Object.freeze({
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
});

function result(status, name, message) {
  return { status, name, message };
}

function collectEnvironmentReferences(value, references = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)) {
      references.add(match[1]);
    }
    return references;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectEnvironmentReferences(item, references);
    return references;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectEnvironmentReferences(item, references);
    }
  }

  return references;
}

export function inspectSettings(settings, settingsPath, env = process.env) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return [
      result(
        "fail",
        "Settings structure",
        `${settingsPath}: root value must be a JSON object.`,
      ),
    ];
  }

  const checks = [];
  const packages = settings.packages;

  if (packages !== undefined && !Array.isArray(packages)) {
    checks.push(
      result(
        "fail",
        "Package settings",
        `${settingsPath}: packages must be an array.`,
      ),
    );
  } else {
    const packageSources = packages ?? [];
    const duplicates = [
      ...new Set(
        packageSources.filter(
          (source, index) => packageSources.indexOf(source) !== index,
        ),
      ),
    ];
    checks.push(
      duplicates.length === 0
        ? result(
            "pass",
            "Package settings",
            `${settingsPath}: ${packageSources.length} package source(s), no duplicates.`,
          )
        : result(
            "warn",
            "Package settings",
            `${settingsPath}: duplicate source(s): ${duplicates.join(", ")}`,
          ),
    );
  }

  const missingVariables = [...collectEnvironmentReferences(settings)].filter(
    (name) => !env[name],
  );
  checks.push(
    missingVariables.length === 0
      ? result(
          "pass",
          "Environment",
          `${settingsPath}: referenced environment variables are available.`,
        )
      : result(
          "warn",
          "Environment",
          `${settingsPath}: missing ${missingVariables.join(", ")}.`,
        ),
  );

  return checks;
}

function inspectSettingsFile(settingsPath, env) {
  if (!existsSync(settingsPath)) return [];

  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    const settingsChecks = inspectSettings(settings, settingsPath, env);
    const validStructure = !settingsChecks.some(
      (check) => check.name === "Settings structure",
    );
    return [
      result(
        validStructure ? "pass" : "fail",
        "Settings JSON",
        validStructure
          ? `${settingsPath}: valid JSON object.`
          : `${settingsPath}: JSON root must be an object.`,
      ),
      ...(validStructure ? settingsChecks : []),
    ];
  } catch (error) {
    return [
      result(
        "fail",
        "Settings JSON",
        `${settingsPath}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    ];
  }
}

function defaultRunPi() {
  return spawnSync("pi", ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

export function runDiagnostics(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const homeDirectory = options.homeDirectory ?? homedir();
  const env = options.env ?? process.env;
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const runPi = options.runPi ?? defaultRunPi;
  const checks = [];

  const nodeMajor = Number.parseInt(nodeVersion.split(".")[0], 10);
  checks.push(
    Number.isInteger(nodeMajor) && nodeMajor >= 20
      ? result("pass", "Node.js", `v${nodeVersion} (20 or newer).`)
      : result(
          "fail",
          "Node.js",
          `v${nodeVersion}; Pi Rakit requires Node.js 20+.`,
        ),
  );

  const piResult = runPi();
  if (piResult.error || piResult.status !== 0) {
    checks.push(
      result(
        "fail",
        "Pi CLI",
        "The pi executable is unavailable or failed to run.",
      ),
    );
  } else {
    const version = String(
      piResult.stdout || piResult.stderr || "installed",
    ).trim();
    checks.push(result("pass", "Pi CLI", version || "installed"));
  }

  const settingsPaths = [
    path.join(homeDirectory, ".pi", "agent", "settings.json"),
    path.join(cwd, ".pi", "settings.json"),
  ];
  const existingPaths = settingsPaths.filter((settingsPath) =>
    existsSync(settingsPath),
  );
  if (existingPaths.length === 0) {
    checks.push(
      result(
        "warn",
        "Settings",
        "No global or project Pi settings file was found.",
      ),
    );
  } else {
    for (const settingsPath of existingPaths) {
      checks.push(...inspectSettingsFile(settingsPath, env));
    }
  }

  return checks;
}

export function formatDiagnostics(checks) {
  const lines = ["Pi Rakit Doctor"];
  for (const check of checks) {
    lines.push(
      `[${STATUS_LABELS[check.status]}] ${check.name}: ${check.message}`,
    );
  }

  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const check of checks) counts[check.status] += 1;
  lines.push(
    `Summary: ${counts.pass} passed, ${counts.warn} warning(s), ${counts.fail} failed.`,
  );
  return lines.join("\n");
}

export default function doctor(pi) {
  pi.registerCommand("doctor", {
    description: "Check Pi runtime, settings, packages, and environment",
    handler: async (_args, ctx) => {
      const checks = runDiagnostics({ cwd: process.cwd() });
      const report = formatDiagnostics(checks);
      const severity = checks.some((check) => check.status === "fail")
        ? "error"
        : checks.some((check) => check.status === "warn")
          ? "warning"
          : "info";
      ctx.ui.notify(report, severity);
    },
  });
}
