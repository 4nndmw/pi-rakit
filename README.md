# Pi Rakit

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

The installer also provides optional third-party packages:

- [Ponytail](https://github.com/DietrichGebert/ponytail) (`@dietrichgebert/ponytail@4.9.0`): a workflow extension that encourages minimal, focused solutions

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

## Publishing

First, authenticate and run the publishing checks:

```bash
npm login
npm whoami
npm run publish:npm:dry
```

Then publish all public workspaces:

```bash
npm run publish:npm
```

Publishing is intentionally not automatic. Increment the affected package version before each subsequent release.

## Adding Another Extension

1. Copy `packages/hello-pi` to a new directory.
2. Change its npm package name and extension implementation.
3. Add it to `manifest.json`.
4. Add its workspace path to `PUBLISH_WORKSPACES` in `scripts/publish-npm.mjs` and the `pack:dry` script.
5. Run `npm run check`.

## License

Choose and add a license before public distribution.
