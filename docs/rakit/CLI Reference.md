# CLI Reference

## Synopsis

```bash
npx pi-rakit [options]
```

Display built-in help:

```bash
npx pi-rakit@latest --help
```

## Options

| Option | Description | Default |
| --- | --- | --- |
| `--cwd <path>` | Set the target project directory. | Current working directory |
| `--manifest <path>` | Load a custom package manifest. | Manifest bundled with `pi-rakit` |
| `--global` | Update the user-level Pi settings. | Enabled |
| `--local` | Update settings inside the target project. | Disabled |
| `--dev` | Resolve workspace packages to local filesystem paths. | Disabled |
| `--install` | Run `pi install` after updating settings. | Disabled |
| `--write-only` | Never invoke `pi install`, even with `--install`. | Disabled |
| `--dry-run` | Preview settings changes without writing or installing. | Disabled |
| `--package <id>` | Select a package by manifest ID; repeat for multiple packages. | Interactive selection |
| `--list-packages` | Print visible package IDs, labels, and npm sources, then exit. | Disabled |
| `--json` | Format `--list-packages` output as JSON. | Disabled |
| `--select-all` | Select all visible manifest packages. | Disabled |
| `--yes`, `-y` | Skip the confirmation prompt. | Disabled |
| `--version`, `-v` | Print the installed Pi Rakit version and exit. | Disabled |
| `--help`, `-h` | Print help and exit. | Disabled |

Unknown options and options with missing values cause the command to exit with an error.

Print the installed CLI version without loading the manifest or target project:

```bash
npx pi-rakit@latest --version
```

## Settings Locations

### Global

```text
~/.pi/agent/settings.json
```

Example:

```bash
npx pi-rakit@latest
```

### Local

```text
<cwd>/.pi/settings.json
```

Example:

```bash
npx pi-rakit@latest --local
```

Use `--cwd` to target another existing directory:

```bash
npx pi-rakit@latest --cwd /path/to/project --local
```

## Package Selection

Without `--package` or `--select-all`, Pi Rakit opens an interactive checkbox prompt. Packages with `enabledByDefault: true` start selected. Packages marked `hidden: true` are omitted from the selector.

List the available manifest IDs before selecting packages:

```bash
npx pi-rakit@latest --list-packages
```

The tab-separated output contains the package ID, display label, and npm source. `--list-packages` also supports `--manifest <path>` and exits without prompting or changing settings.

For automation, request a JSON array whose objects contain stable `id`, `label`, and `source` fields:

```bash
npx pi-rakit@latest --list-packages --json
```

`--json` requires `--list-packages` and cannot be used during installation.

Use repeatable `--package` options for noninteractive, targeted selection:

```bash
npx pi-rakit@latest \
  --local \
  --package ponytail \
  --package caveman \
  --yes
```

`--package` accepts manifest IDs, rejects unknown IDs, and cannot be combined with `--select-all`. Duplicate IDs are ignored. If no package is selected, the CLI exits without changing settings. Package requirements are automatically added before dependent packages.

Preview the target settings path and package sources that would be added:

```bash
npx pi-rakit@latest \
  --local \
  --package ponytail \
  --package caveman \
  --dry-run
```

Dry-run mode reads and validates existing settings, but does not prompt for confirmation, write files, or run `pi install` even when `--install` is present. Sources already in settings are omitted from the preview.

## Settings Merge Behavior

Pi Rakit:

1. Reads the existing settings file, or starts with an empty object.
2. Preserves unrelated settings fields.
3. Appends selected package sources to `packages`.
4. Removes duplicate package source entries.
5. Writes formatted JSON with a trailing newline.

Invalid existing JSON causes an error instead of overwriting the file.

## Development Mode

Repository contributors can point workspace packages at local source directories:

```bash
node apps/installer/src/cli.js \
  --local \
  --dev \
  --select-all \
  --yes \
  --write-only
```

Workspace sources become paths relative to the target `.pi` directory. npm-only entries remain `npm:<package-name>` sources.

For the manifest schema, see [[Package Manifest]].
