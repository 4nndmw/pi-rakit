# Pi Rakit

[![CI](https://github.com/4nndmw/pi-rakit/actions/workflows/ci.yml/badge.svg)](https://github.com/4nndmw/pi-rakit/actions/workflows/ci.yml)

A monorepo for selecting and installing a collection of extensions through an interactive installer for [Pi](https://pi.dev/), the AI coding agent.

Pi Rakit is designed specifically for the Pi extension ecosystem. It updates Pi package settings and can optionally install the selected extensions using the `pi` CLI.

## Requirements

- Node.js 20+
- npm 11+
- Pi installed and available as `pi`

## Packages

- [`pi-rakit`](https://www.npmjs.com/package/pi-rakit): the main interactive CLI installer
- [`pi-rakit-custom-provider`](https://www.npmjs.com/package/pi-rakit-custom-provider): unified `/custom-provider` command to switch providers, manage custom providers, and manage Pi-native `models.json` providers and models
- [`pi-rakit-markdown-preview`](https://www.npmjs.com/package/pi-rakit-markdown-preview): render any markdown file in a scrollable TUI overlay with `/md <file>`
- [`pi-rakit-doctor`](https://www.npmjs.com/package/pi-rakit-doctor): read-only health checks through the `/doctor` command
- [`pi-rakit-worktree`](https://www.npmjs.com/package/pi-rakit-worktree): safe Git worktree management through the `/worktree` command
- [`pi-rakit-git`](https://www.npmjs.com/package/pi-rakit-git): focused status, branch, and confirmation-gated commit commands through `/git`
- [`pi-rakit-biome`](https://www.npmjs.com/package/pi-rakit-biome): safe checks, linting, and confirmation-gated formatting through `/biome`
- [`pi-rakit-token-speed`](https://www.npmjs.com/package/pi-rakit-token-speed): live token streaming speed in the Pi status bar
- [`pi-rakit-session-usage`](https://www.npmjs.com/package/pi-rakit-session-usage): current-session and project-history token usage
- [`pi-rakit-session-stats`](https://www.npmjs.com/package/pi-rakit-session-stats): elapsed time, prompt, turn, and tool-call tracking
- [`pi-rakit-session-delete`](https://www.npmjs.com/package/pi-rakit-session-delete): interactive, confirmation-gated deletion of inactive sessions
- [`pi-rakit-compact-tools`](https://www.npmjs.com/package/pi-rakit-compact-tools): compact renderers for built-in tool output
- [`pi-rakit-auto-title`](https://www.npmjs.com/package/pi-rakit-auto-title): automatic local session titles for easier `/resume` browsing
- [`pi-rakit-onboarding`](https://www.npmjs.com/package/pi-rakit-onboarding): reopen package selection through `/onboarding`
- [`pi-rakit-plan-mode`](https://www.npmjs.com/package/pi-rakit-plan-mode): read-only exploration, structured plans, and tracked execution
- [`pi-rakit-ui`](https://www.npmjs.com/package/pi-rakit-ui): cohesive global theme, header, footer, editor, and working indicator

The installer also provides optional third-party packages:

- [Ponytail](https://github.com/DietrichGebert/ponytail) (`@dietrichgebert/ponytail@4.9.0`): a workflow extension that encourages minimal, focused solutions
- [Caveman](https://github.com/0xkuze/pi-caveman) (`caveman-pi@1.0.0`): a terse response mode with a `/caveman` toggle and prompt compression tools

## Usage

Run the interactive installer:

```bash
npx pi-rakit@latest
```

Install packages only for the current project:

```bash
npx pi-rakit@latest --local
```

By default, the CLI only updates the Pi settings. Add `--install` to also invoke `pi install` for each selected package. The installer always adds the hidden Onboarding package so you can later run `/onboarding`, choose global or project scope, and revise the selection without leaving Pi.

### Custom Provider Extension

Install Custom Provider directly to connect Pi to an OpenAI-compatible local server or hosted gateway:

```bash
pi install npm:pi-rakit-custom-provider
```

Run `/custom-provider` inside Pi to open the unified management menu:

- **Select a provider** — shows all registered providers with model count; pick one to switch the active model
- **Add custom provider** — prompts API URL, key, and auto-discovers models from `GET <baseUrl>/models`
- **Manage custom providers** — add, edit, or delete providers and their models (saved to `~/.pi/agent/settings.json`)
- **Manage models.json** — add, edit, or delete providers and models in Pi-native `~/.pi/agent/models.json`

Model lists show inline details: `ag-claude — ctx:68k max:16k` and `🧠` for reasoning models. When creating or editing a model, choose input type `text` or `text + image`.

The defaults use Ollama at `http://localhost:11434/v1` with model `llama3.2`. Configure another endpoint through `PI_RAKIT_PROVIDER_BASE_URL`, `PI_RAKIT_PROVIDER_API_KEY`, and `PI_RAKIT_PROVIDER_MODEL` before starting Pi. See the [package README](packages/custom-provider/README.md).

### Markdown Preview Extension

Install Markdown Preview directly to render any markdown file as a scrollable overlay:

```bash
pi install npm:pi-rakit-markdown-preview
```

```text
/md path/to/file.md
```

Controls: `↑`/`↓` to scroll, `q` or `Esc` to close.

### Doctor Extension

Install Doctor directly and run a read-only health check inside Pi:

```bash
pi install npm:pi-rakit-doctor
```

```text
/doctor
```

Doctor checks the runtime, global and project settings, duplicate package sources, and referenced environment variables. See the [complete Doctor guide](docs/rakit/Doctor.md).

### Worktree Extension

Install Worktree directly when you do not need the interactive installer:

```bash
pi install npm:pi-rakit-worktree
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
pi install npm:pi-rakit-git
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
pi install npm:pi-rakit-biome
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
pi install npm:pi-rakit-token-speed
```

The status shows an updating estimate while content streams and a final rate based on provider-reported output token usage when the response finishes.

### Plan Mode Extension

Install Plan Mode directly for read-only analysis and structured execution:

```bash
pi install npm:pi-rakit-plan-mode
```

Run `/plan` or press `Ctrl+Alt+P` to toggle it. Plan mode blocks mutation tools and non-allowlisted shell commands. Generated numbered plans can be refined or executed with persistent checklist progress. See the [complete Plan Mode guide](docs/rakit/Plan%20Mode.md).

### Rakit UI

Install the global visual system directly:

```bash
pi install npm:pi-rakit-ui
```

Rakit UI applies the bundled `rakit` theme plus a compact header, diagnostic footer, framed editor, and working indicator. Use `/rakit-ui [on|off|theme]` for runtime control. Built-in transcript and picker layouts stay native Pi components and inherit the theme. See the [complete Rakit UI guide](docs/rakit/Rakit%20UI.md).

### Session Utilities

Install any utility independently:

```bash
pi install npm:pi-rakit-session-usage
pi install npm:pi-rakit-session-stats
pi install npm:pi-rakit-session-delete
pi install npm:pi-rakit-compact-tools
pi install npm:pi-rakit-auto-title
pi install npm:pi-rakit-onboarding
pi install npm:pi-rakit-plan-mode
pi install npm:pi-rakit-ui
```

Use `/usage` for current and project token totals, `/session-stats` for elapsed/count metrics, and `/session-delete` for confirmed deletion of an inactive session. Compact Tools changes only interactive rendering, while Auto Title derives a local title from the first prompt without making an extra model request. Run `/onboarding` to update only Pi Rakit-managed package entries while preserving unrelated settings and packages.

## Uninstall

Remove every package that Pi Rakit installed:

```bash
pi remove npm:pi-rakit
pi remove npm:pi-rakit-custom-provider
pi remove npm:pi-rakit-doctor
pi remove npm:pi-rakit-worktree
pi remove npm:pi-rakit-git
pi remove npm:pi-rakit-biome
pi remove npm:pi-rakit-token-speed
pi remove npm:pi-rakit-session-usage
pi remove npm:pi-rakit-session-stats
pi remove npm:pi-rakit-session-delete
pi remove npm:pi-rakit-compact-tools
pi remove npm:pi-rakit-auto-title
pi remove npm:pi-rakit-onboarding
pi remove npm:pi-rakit-plan-mode
pi remove npm:pi-rakit-ui
pi remove npm:pi-rakit-playwright-browser
pi remove npm:pi-rakit-markdown-preview
```

Or uninstall in one line:

```bash
pi remove \
  npm:pi-rakit \
  npm:pi-rakit-custom-provider \
  npm:pi-rakit-doctor \
  npm:pi-rakit-worktree \
  npm:pi-rakit-git \
  npm:pi-rakit-biome \
  npm:pi-rakit-token-speed \
  npm:pi-rakit-session-usage \
  npm:pi-rakit-session-stats \
  npm:pi-rakit-session-delete \
  npm:pi-rakit-compact-tools \
  npm:pi-rakit-auto-title \
  npm:pi-rakit-onboarding \
  npm:pi-rakit-plan-mode \
  npm:pi-rakit-ui \
  npm:pi-rakit-playwright-browser \
  npm:pi-rakit-markdown-preview
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

1. Copy an existing package (for example `packages/doctor`) to a new directory.
2. Change its npm package name and extension implementation.
3. Add it to `manifest.json`.
4. Add its workspace path to `PUBLISH_WORKSPACES` in `scripts/publish-npm.mjs` and the `pack:dry` script.
5. Run `npm run check`.

## License

Licensed under the [MIT License](LICENSE).
