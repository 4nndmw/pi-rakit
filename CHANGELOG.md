# Changelog

All notable changes to published Pi Rakit packages are recorded here. This monorepo versions each npm workspace independently.

Dates use `YYYY-MM-DD`. Package links point to npm, where every published version remains available.

## [@4nndmw/pi-rakit](https://www.npmjs.com/package/@4nndmw/pi-rakit)

### 0.1.20 - 2026-09-05

- Added Pi Rakit Plan Mode and Pi Rakit UI to the installer catalog with npm and workspace development-mode resolution.

### 0.1.18 - 2026-09-04

- Added the hidden, mandatory Onboarding package so `/onboarding` can revise global or project package selections from inside Pi.
- Removed the stale Plan Mode catalog and release references because that workspace was never present.

### 0.1.17 - 2026-09-01

- Added Session Usage, Session Stats, Session Delete, Compact Tools, and Auto Title to the installer catalog.
- Added workspace development-mode resolution for all five packages.

### 0.1.16 - 2026-09-01

- Added Pi Rakit Token Speed to the installer catalog with workspace development-mode resolution.

### 0.1.15 - 2026-09-01

- Added Pi Rakit Biome to the installer catalog with workspace development-mode resolution.

### 0.1.14 - 2026-09-01

- Added `--output <path>` for writing JSON listing, dry-run, and check results to a file.
- Added parent-directory creation, clean stdout, preserved check exit codes, and end-to-end documentation coverage.

### 0.1.13 - 2026-09-01

- Added nonmutating `--check` mode for CI, with a nonzero exit status when selected package sources are missing.
- Added JSON check output plus argument, end-to-end, and documentation coverage.

### 0.1.12 - 2026-09-01

- Added `--json` support for `--dry-run` with stable scope, settings path, resolved sources, and newly added sources.
- Added argument, end-to-end, and documentation coverage for machine-readable dry-run previews.

### 0.1.11 - 2026-09-01

- Added `--dry-run` to preview the target settings path and package sources without writing files, prompting, or running `pi install`.
- Added argument, end-to-end, and documentation coverage for non-mutating previews.

### 0.1.10 - 2026-09-01

- Added `--version` and `-v` to print the installed CLI version without loading a manifest or target project.
- Added argument, subprocess, and documentation coverage for version output.

### 0.1.9 - 2026-09-01

- Added `--json` for machine-readable `--list-packages` output.
- Added argument validation, documentation, and unit/end-to-end coverage for JSON package listing.

### 0.1.8 - 2026-09-01

- Added `--list-packages` to display visible manifest IDs, labels, and npm sources without changing settings.
- Added custom-manifest and end-to-end coverage for package listing.

### 0.1.7 - 2026-09-01

- Added repeatable `--package <id>` options for targeted noninteractive package selection.
- Added argument validation and end-to-end coverage for package selection.

### 0.1.6 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.5 - 2026-09-01

- Added Pi Rakit Git to the installer catalog.
- Added workspace development-mode resolution for the Git package.

### 0.1.4 - 2026-09-01

- Added Pi Rakit Worktree to the installer catalog.
- Added workspace development-mode resolution for the Worktree package.

### 0.1.3 - 2026-09-01

- Added Pi Rakit Doctor to the installer catalog.

### 0.1.2 - 2026-09-01

- Added Pi Rakit Custom Provider to the installer catalog.
- Added the pinned third-party Ponytail and Caveman options.

### 0.1.1 - 2026-09-01

- Published the initial repository-backed interactive installer.
- Added global and project-local settings support, package selection, and development-mode workspace sources.

### 0.1.0 - 2026-09-01

- Initial npm release. Detailed release notes are not present in the repository history.

## [@4nndmw/ui](https://www.npmjs.com/package/@4nndmw/ui)

### 0.1.0 - 2026-09-05

- Added the bundled `rakit` theme and global branded header, footer, editor, and working indicator.
- Added `/rakit-ui [on|off|theme]`, narrow-terminal rendering, diagnostic preservation, and clean default restoration.

## [@4nndmw/plan-mode](https://www.npmjs.com/package/@4nndmw/plan-mode)

### 0.1.0 - 2026-09-05

- Added `/plan`, `Ctrl+Alt+P`, and `--plan` activation for read-only exploration.
- Added conservative tool and shell guards, numbered plan extraction, refinement, tracked execution, `/todos`, and session persistence.

## [@4nndmw/onboarding](https://www.npmjs.com/package/@4nndmw/onboarding)

### 0.1.0 - 2026-09-04

- Added `/onboarding` with global/project scope selection, an interactive package multi-select, settings-preserving reconciliation, and automatic reload.

## [@4nndmw/hello-pi](https://www.npmjs.com/package/@4nndmw/hello-pi)

### 0.1.1 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.0 - 2026-09-01

- Initial example extension with the `/hello` command.

## [@4nndmw/custom-provider](https://www.npmjs.com/package/@4nndmw/custom-provider)

### 0.1.7 - 2026-09-04

- Added automatic OpenAI-compatible model discovery through `GET <baseUrl>/models`, with model selection, a five-second timeout, and manual fallback.

### 0.1.5 - 2026-09-04

- Persist custom provider configuration to `~/.pi/agent/settings.json` so it survives Pi restarts.
- Load and re-register saved custom provider config on extension startup.

### 0.1.2 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.1 - 2026-09-01

- Expanded npm documentation with Ollama setup, environment variables, credential handling, and troubleshooting.

### 0.1.0 - 2026-09-01

- Initial configurable OpenAI-compatible provider.
- Added environment-based model, endpoint, token-limit, reasoning, image, and API-key configuration.

## [@4nndmw/doctor](https://www.npmjs.com/package/@4nndmw/doctor)

### 0.1.2 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.1 - 2026-09-01

- Expanded npm documentation with check interpretation and troubleshooting guidance.

### 0.1.0 - 2026-09-01

- Initial read-only `/doctor` diagnostics command.
- Added checks for Node.js, the Pi CLI, settings JSON, duplicate package sources, and referenced environment variables.

## [@4nndmw/biome](https://www.npmjs.com/package/@4nndmw/biome)

### 0.1.0 - 2026-09-01

- Added `/biome check` and `/biome lint` for read-only project validation.
- Added confirmation-gated `/biome format` with safe path-only targets.
- Pinned `@biomejs/biome` to version 2.5.11 for reproducible execution.

## [@4nndmw/git](https://www.npmjs.com/package/@4nndmw/git)

### 0.1.1 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.0 - 2026-09-01

- Added `/git status` and `/git branch` for read-only repository inspection.
- Added confirmation-gated `/git commit <message>` for already-staged changes.
- Excluded staging, push, reset, clean, force, and branch-deletion operations.

## [@4nndmw/worktree](https://www.npmjs.com/package/@4nndmw/worktree)

### 0.1.2 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.1 - 2026-09-01

- Expanded npm documentation with complete usage, safety behavior, and troubleshooting guidance.

### 0.1.0 - 2026-09-01

- Initial `/worktree list|create|remove` commands.
- Added sibling-directory worktrees, prefixed branches, clean-tree checks, protected branch names, and non-forced removal.

## [@4nndmw/token-speed](https://www.npmjs.com/package/@4nndmw/token-speed)

### 0.1.0 - 2026-09-01

- Initial release with estimated live and provider-usage-based final token streaming speed in the Pi status bar.

## [@4nndmw/session-usage](https://www.npmjs.com/package/@4nndmw/session-usage)

### 0.1.0 - 2026-09-01

- Added `/usage` and status-bar totals for current-session and project-history token usage.

## [@4nndmw/session-stats](https://www.npmjs.com/package/@4nndmw/session-stats)

### 0.1.0 - 2026-09-01

- Added elapsed time, prompt, assistant-turn, and tool-call tracking with `/session-stats`.

## [@4nndmw/session-delete](https://www.npmjs.com/package/@4nndmw/session-delete)

### 0.1.0 - 2026-09-01

- Added interactive, confirmation-gated deletion for inactive project sessions.

## [@4nndmw/compact-tools](https://www.npmjs.com/package/@4nndmw/compact-tools)

### 0.1.1 - 2026-09-03

- Switched extension imports to the current `@earendil-works` Pi runtime, removing the obsolete vulnerable `@mariozechner` runtime dependency.
- Documented the conflict with the superseded `@gnoviawan/pi-compact-tool-preview` package.

### 0.1.0 - 2026-09-01

- Added compact interactive renderers for Pi's built-in file, search, and shell tools.

## [@4nndmw/auto-title](https://www.npmjs.com/package/@4nndmw/auto-title)

### 0.1.0 - 2026-09-01

- Added deterministic local session titles derived from the first prompt without extra model calls.
