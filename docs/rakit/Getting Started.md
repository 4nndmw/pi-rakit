# Getting Started

## Requirements

- Node.js 20 or newer
- npm 11 or newer
- Pi installed and available as the `pi` command

## Run the Installer

Launch the interactive package selector without installing Pi Rakit globally:

```bash
npx pi-rakit@latest
```

By default, Pi Rakit updates the global Pi settings file:

```text
~/.pi/agent/settings.json
```

Select the packages you want, review the installation plan, and confirm the change.

## Project-Local Configuration

Use `--local` to update only the current project:

```bash
npx pi-rakit@latest --local
```

This writes the package list to:

```text
<current-project>/.pi/settings.json
```

A generated configuration may look like this:

```json
{
  "packages": [
    "npm:pi-rakit-hello",
    "npm:pi-mcp-adapter"
  ]
}
```

Existing settings are preserved, and package sources already in the list are not duplicated.

## Update Settings and Install Packages

Pi Rakit updates settings by default but does not invoke `pi install`. Add `--install` when you want both operations:

```bash
npx pi-rakit@latest --local --install
```

For local mode, Pi Rakit invokes `pi install <source> -l` for every selected source. In global mode, it invokes `pi install <source>`.

## Non-Interactive Usage

Select every visible package and skip confirmation:

```bash
npx pi-rakit@latest --local --select-all --yes
```

This is useful for setup scripts and smoke tests. See [[CLI Reference]] for every available option.

## Try the Example Extension

After adding `pi-rakit-hello`, start Pi and run:

```text
/hello
```

You can include a name:

```text
/hello Anand
```

The extension displays a greeting in the Pi interface.
