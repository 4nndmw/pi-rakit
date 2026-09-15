# Pi Rakit

[![CI](https://github.com/4nndmw/pi-rakit/actions/workflows/ci.yml/badge.svg)](https://github.com/4nndmw/pi-rakit/actions/workflows/ci.yml)

A monorepo for selecting and installing a collection of extensions through an interactive installer for [Pi](https://pi.dev/), the AI coding agent.

Pi Rakit is designed specifically for the Pi extension ecosystem. It updates Pi package settings and can optionally install the selected extensions using the `pi` CLI.

## Requirements

- Node.js 20+
- npm 11+
- Pi installed and available as `pi`

## Packages

- [`@anandamw/pi-rakit`](https://www.npmjs.com/package/@anandamw/pi-rakit): the main interactive CLI installer
- [`@anandamw/hello-pi`](https://www.npmjs.com/package/@anandamw/hello-pi): an example extension that provides the `/hello` command
- [`@anandamw/custom-provider`](https://www.npmjs.com/package/@anandamw/custom-provider): unified `/rakit` command to switch providers, manage custom providers, and manage Pi-native `models.json` providers and models
- [`@anandamw/markdown-preview`](https://www.npmjs.com/package/@anandamw/markdown-preview): render any markdown file in a scrollable TUI overlay with `/md <file>`
- [`@anandamw/doctor`](https://www.npmjs.com/package/@anandamw/doctor): read-only health checks through the `/doctor` command
- [`@anandamw/worktree`](https://www.npmjs.com/package/@anandamw/worktree): safe Git worktree management through the `/worktree` command
- [`@anandamw/git`](https://www.npmjs.com/package/@anandamw/git): focused status, branch, and confirmation-gated commit commands through `/git`
- [`@anandamw/biome`](https://www.npmjs.com/package/@anandamw/biome): safe checks, linting, and confirmation-gated formatting through `/biome`
- [`@anandamw/token-speed`](https://www.npmjs.com/package/@anandamw/token-speed): live token streaming speed in the Pi status bar
- [`@anandamw/session-usage`](https://www.npmjs.com/package/@anandamw/session-usage): current-session and project-history token usage
- [`@anandamw/session-stats`](https://www.npmjs.com/package/@anandamw/session-stats): elapsed time, prompt, turn, and tool-call tracking
- [`@anandamw/session-delete`](https://www.npmjs.com/package/@anandamw/session-delete): interactive, confirmation-gated deletion of inactive sessions
- [`@anandamw/compact-tools`](https://www.npmjs.com/package/@anandamw/compact-tools): compact renderers for built-in tool output
- [`@anandamw/auto-title`](https://www.npmjs.com/package/@anandamw/auto-title): automatic local session titles for easier `/resume` browsing
- [`@anandamw/onboarding`](https://www.npmjs.com/package/@anandamw/onboarding): reopen package selection through `/onboarding`
- [`@anandamw/plan-mode`](https://www.npmjs.com/package/@anandamw/plan-mode): read-only exploration, structured plans, and tracked execution
- [`@anandamw/ui`](https://www.npmjs.com/package/@anandamw/ui): cohesive global theme, header, footer, editor, and working indicator

The installer also provides optional third-party packages:

- [Ponytail](https://github.com/DietrichGebert/ponytail) (`@dietrichgebert/ponytail@4.9.0`): a workflow extension that encourages minimal, focused solutions
- [Caveman](https://github.com/0xkuze/pi-caveman) (`caveman-pi@1.0.0`): a terse response mode with a `/caveman` toggle and prompt compression tools

## Usage

Run the interactive installer:

```bash
npx @anandamw/pi-rakit@latest
```

Install packages only for the current project:

```bash
npx @anandamw/pi-rakit@latest --local
```

By default, the CLI only updates the Pi settings. Add `--install` to also invoke `pi install` for each selected package. The installer always adds the hidden Onboarding package so you can later run `/onboarding`, choose global or project scope, and revise the selection without leaving Pi.

### Custom Provider Extension

Install Custom Provider directly to connect Pi to an OpenAI-compatible local server or hosted gateway:

```bash
pi install npm:@anandamw/custom-provider
```

Run `/rakit` inside Pi to open the unified management menu:

- **Select a provider** — shows all registered providers with model count; pick one to switch the active model
- **Add custom provider** — prompts API URL, key, and auto-discovers models from `GET <baseUrl>/models`
- **Manage custom providers** — add, edit, or delete providers and their models (saved to `~/.pi/agent/settings.json`)
- **Manage models.json** — add, edit, or delete providers and models in Pi-native `~/.pi/agent/models.json`

Model lists show inline details: `ag-claude — ctx:68k max:16k` and `🧠` for reasoning models. When creating or editing a model, choose input type `text` or `text + image`.

The defaults use Ollama at `http://localhost:11434/v1` with model `llama3.2`. Configure another endpoint through `PI_RAKIT_PROVIDER_BASE_URL`, `PI_RAKIT_PROVIDER_API_KEY`, and `PI_RAKIT_PROVIDER_MODEL` before starting Pi. See the [package README](packages/custom-provider/README.md).

### Markdown Preview Extension

Install Markdown Preview directly to render any markdown file as a scrollable overlay:

```bash
pi install npm:@anandamw/markdown-preview
```

```text
/md path/to/file.md
```

Controls: `↑`/`↓` to scroll, `q` or `Esc` to close.

### Doctor Extension

Install Doctor directly and run a read-only health check inside Pi:

```bash
pi install npm:@anandamw/doctor
```

```text
/doctor
```

Doctor checks the runtime, global and project settings, duplicate package sources, and referenced environment variables. See the [complete Doctor guide](docs/rakit/Doctor.md).

### Worktree Extension

Install Worktree directly when you do not need the interactive installer:

```bash
pi install npm:@anandamw/worktree
```

Then start or reload Pi and run:

```text
/worktree list
/worktree create issue-123
/worktree remove issue-123
```

Creating `issue-123` creates branch `worktree/issue-123` in the sibling directory `<repository>-issue-123`. Removal requires confirmation and a clean target, removes only the worktree directory, and preserves the branch. See the [complete Worktree guide](docs/rakit/Worktree.md).

### Git Extension

Install Git directly for focused repository inspection and staged commits:

```bash
pi install npm:@anandamw/git
```

```text
/git status
/git branch
/git commit Explain the staged change
```

The commit command requires confirmation and commits only changes already staged by the user. It never stages, pushes, resets, or bypasses hooks. See the [complete Git guide](docs/rakit/Git.md).

### Biome Extension

Install Biome directly for project checks, linting, and formatting:

```bash
pi install npm:@anandamw/biome
```

```text
/biome check
/biome lint src
/biome format src
```

Check and lint are read-only. Format writes files only after explicit confirmation and arbitrary CLI flags are rejected.

### Token Speed Extension

Install Token Speed directly to display live generation throughput in Pi's footer:

```bash
pi install npm:@anandamw/token-speed
```

The status shows an updating estimate while content streams and a final rate based on provider-reported output token usage when the response finishes.

### Plan Mode Extension

Install Plan Mode directly for read-only analysis and structured execution:

```bash
pi install npm:@anandamw/plan-mode
```

Run `/plan` or press `Ctrl+Alt+P` to toggle it. Plan mode blocks mutation tools and non-allowlisted shell commands. Generated numbered plans can be refined or executed with persistent checklist progress. See the [complete Plan Mode guide](docs/rakit/Plan%20Mode.md).

### Rakit UI

Install the global visual system directly:

```bash
pi install npm:@anandamw/ui
```

Rakit UI applies the bundled `rakit` theme plus a compact header, diagnostic footer, framed editor, and working indicator. Use `/rakit-ui [on|off|theme]` for runtime control. Built-in transcript and picker layouts stay native Pi components and inherit the theme. See the [complete Rakit UI guide](docs/rakit/Rakit%20UI.md).

### Session Utilities

Install any utility independently:

```bash
pi install npm:@anandamw/session-usage
pi install npm:@anandamw/session-stats
pi install npm:@anandamw/session-delete
pi install npm:@anandamw/compact-tools
pi install npm:@anandamw/auto-title
pi install npm:@anandamw/onboarding
pi install npm:@anandamw/plan-mode
pi install npm:@anandamw/ui
```

Use `/usage` for current and project token totals, `/session-stats` for elapsed/count metrics, and `/session-delete` for confirmed deletion of an inactive session. Compact Tools changes only interactive rendering, while Auto Title derives a local title from the first prompt without making an extra model request. Run `/onboarding` to update only Pi Rakit-managed package entries while preserving unrelated settings and packages.

## Uninstall

Remove every package that Pi Rakit installed:

```bash
pi remove npm:@anandamw/pi-rakit
pi remove npm:@anandamw/hello-pi
pi remove npm:@anandamw/custom-provider
pi remove npm:@anandamw/doctor
pi remove npm:@anandamw/worktree
pi remove npm:@anandamw/git
pi remove npm:@anandamw/biome
pi remove npm:@anandamw/token-speed
pi remove npm:@anandamw/session-usage
pi remove npm:@anandamw/session-stats
pi remove npm:@anandamw/session-delete
pi remove npm:@anandamw/compact-tools
pi remove npm:@anandamw/auto-title
pi remove npm:@anandamw/onboarding
pi remove npm:@anandamw/plan-mode
pi remove npm:@anandamw/ui
pi remove npm:@anandamw/playwright-browser
pi remove npm:@anandamw/markdown-preview
```

Or uninstall in one line:

```bash
pi remove \
  npm:@anandamw/pi-rakit \
  npm:@anandamw/hello-pi \
  npm:@anandamw/custom-provider \
  npm:@anandamw/doctor \
  npm:@anandamw/worktree \
  npm:@anandamw/git \
  npm:@anandamw/biome \
  npm:@anandamw/token-speed \
  npm:@anandamw/session-usage \
  npm:@anandamw/session-stats \
  npm:@anandamw/session-delete \
  npm:@anandamw/compact-tools \
  npm:@anandamw/auto-title \
  npm:@anandamw/onboarding \
  npm:@anandamw/plan-mode \
  npm:@anandamw/ui \
  npm:@anandamw/playwright-browser \
  npm:@anandamw/markdown-preview
```

Third-party packages installed through the installer (Ponytail, Caveman) must be removed separately:

```bash
pi remove npm:@dietrichgebert/ponytail
pi remove caveman-pi
```

After removal, the packages entry in your Pi settings is cleaned up automatically. You can also manually edit `.pi/settings.json` (project) or `~/.pi/agent/settings.json` (global).

## Development

```bash
npm install
npm test
npm run check
```

Test the installer against the current workspace without publishing:

```bash
node apps/installer/src/cli.js --local --dev --select-all --yes --write-only
```

This writes workspace-relative package sources to `.pi/settings.json`. Remove that file after testing if you do not want to commit local Pi settings.

## Releases

See [CHANGELOG.md](CHANGELOG.md) for release notes for every published workspace.

## Publishing

Publishing uses npm Trusted Publishing from the manual [Publish npm package](.github/workflows/publish.yml) workflow. It authenticates with GitHub OIDC, so no npm token or OTP is stored in the repository. Select only the workspace whose version was incremented.

Before the first workflow run, configure each npm package's Trusted Publisher with repository `4nndmw/pi-rakit`, workflow `publish.yml`, and environment `npm-publish`. See [Development and Release](docs/rakit/Development%20and%20Release.md#trusted-publishing-setup) for the full setup and release procedure.

Publishing is intentionally manual. Increment the affected package version and merge it into `main` before dispatching the workflow.

## Adding Another Extension

1. Copy `packages/hello-pi` to a new directory.
2. Change its npm package name and extension implementation.
3. Add it to `manifest.json`.
4. Add its workspace path to `PUBLISH_WORKSPACES` in `scripts/publish-npm.mjs` and the `pack:dry` script.
5. Run `npm run check`.

## License

Licensed under the [MIT License](LICENSE).
