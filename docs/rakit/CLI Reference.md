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
| `--select-all` | Select all visible manifest packages. | Disabled |
| `--yes`, `-y` | Skip the confirmation prompt. | Disabled |
| `--help`, `-h` | Print help and exit. | Disabled |

Unknown options and options with missing values cause the command to exit with an error.

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

Without `--select-all`, Pi Rakit opens an interactive checkbox prompt. Packages with `enabledByDefault: true` start selected. Packages marked `hidden: true` are omitted from the selector.

If no package is selected, the CLI exits without changing settings. Package requirements are automatically added before dependent packages.

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
