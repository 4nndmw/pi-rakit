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
- [`pi-rakit-hello`](https://www.npmjs.com/package/pi-rakit-hello): an example extension that provides the `/hello` command
- [`pi-rakit-custom-provider`](https://www.npmjs.com/package/pi-rakit-custom-provider): a configurable OpenAI-compatible provider for local or hosted models
- [`pi-rakit-doctor`](https://www.npmjs.com/package/pi-rakit-doctor): read-only health checks through the `/doctor` command
- [`pi-rakit-worktree`](https://www.npmjs.com/package/pi-rakit-worktree): safe Git worktree management through the `/worktree` command
- [`pi-rakit-git`](https://www.npmjs.com/package/pi-rakit-git): focused status, branch, and confirmation-gated commit commands through `/git`

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

By default, the CLI only updates the Pi settings. Add `--install` to also invoke `pi install` for each selected package.

### Custom Provider Extension

Install Custom Provider directly to connect Pi to an OpenAI-compatible local server or hosted gateway:

```bash
pi install npm:pi-rakit-custom-provider
```

The defaults use Ollama at `http://localhost:11434/v1` with model `llama3.2`. Configure another endpoint through `PI_RAKIT_PROVIDER_BASE_URL`, `PI_RAKIT_PROVIDER_API_KEY`, and `PI_RAKIT_PROVIDER_MODEL` before starting Pi. See the [complete Custom Provider guide](docs/rakit/Custom%20Provider.md).

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
