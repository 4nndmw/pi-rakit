# Changelog

All notable changes to published Pi Rakit packages are recorded here. This monorepo versions each npm workspace independently.

Dates use `YYYY-MM-DD`. Package links point to npm, where every published version remains available.

## [pi-rakit](https://www.npmjs.com/package/pi-rakit)

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

## [pi-rakit-hello](https://www.npmjs.com/package/pi-rakit-hello)

### 0.1.1 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.0 - 2026-09-01

- Initial example extension with the `/hello` command.

## [pi-rakit-custom-provider](https://www.npmjs.com/package/pi-rakit-custom-provider)

### 0.1.2 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.1 - 2026-09-01

- Expanded npm documentation with Ollama setup, environment variables, credential handling, and troubleshooting.

### 0.1.0 - 2026-09-01

- Initial configurable OpenAI-compatible provider.
- Added environment-based model, endpoint, token-limit, reasoning, image, and API-key configuration.

## [pi-rakit-doctor](https://www.npmjs.com/package/pi-rakit-doctor)

### 0.1.2 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.1 - 2026-09-01

- Expanded npm documentation with check interpretation and troubleshooting guidance.

### 0.1.0 - 2026-09-01

- Initial read-only `/doctor` diagnostics command.
- Added checks for Node.js, the Pi CLI, settings JSON, duplicate package sources, and referenced environment variables.

## [pi-rakit-git](https://www.npmjs.com/package/pi-rakit-git)

### 0.1.1 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.0 - 2026-09-01

- Added `/git status` and `/git branch` for read-only repository inspection.
- Added confirmation-gated `/git commit <message>` for already-staged changes.
- Excluded staging, push, reset, clean, force, and branch-deletion operations.

## [pi-rakit-worktree](https://www.npmjs.com/package/pi-rakit-worktree)

### 0.1.2 - 2026-09-01

- Added the MIT license and standard npm repository, homepage, and issue metadata.

### 0.1.1 - 2026-09-01

- Expanded npm documentation with complete usage, safety behavior, and troubleshooting guidance.

### 0.1.0 - 2026-09-01

- Initial `/worktree list|create|remove` commands.
- Added sibling-directory worktrees, prefixed branches, clean-tree checks, protected branch names, and non-forced removal.
