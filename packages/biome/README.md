# Pi Rakit Biome

A safe [Biome](https://biomejs.dev/) integration for [Pi](https://pi.dev/). It provides read-only check and lint commands plus confirmation-gated formatting. The package pins `@biomejs/biome` so every installation uses a known tool version.

## Install

```bash
pi install npm:pi-rakit-biome
```

Or select **Biome** in the Pi Rakit installer. Start or reload Pi after installation.

## Commands

```text
/biome check
/biome check src test
/biome lint src
/biome format src
```

- `check` runs `biome check` without applying fixes.
- `lint` runs `biome lint` without applying fixes.
- `format` asks for confirmation, then runs `biome format --write`.
- With no path, the command targets the current project (`.`).

Targets are whitespace-separated paths. Options beginning with `-` are rejected so users cannot bypass the extension's safety behavior.

## Configuration

Biome automatically discovers `biome.json` or `biome.jsonc` from the current project. This extension does not create or modify configuration files.

## Safety

Check and lint are read-only. Format clearly announces that it writes files and cannot run until **Format** is selected. Biome is launched directly without a shell, and arbitrary CLI flags are not accepted.

Review your working tree before formatting and inspect the resulting diff afterward.

## Requirements

- Node.js 20+
- Pi

## License

MIT
