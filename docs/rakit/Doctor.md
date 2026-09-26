# Doctor

Pi Rakit Doctor runs health checks on Pi without modifying settings, packages, or environment variables.

## Installation

Select **Doctor** when running the installer:

```bash
npx pi-rakit@latest
```

Or install it directly:

```bash
pi install npm:pi-rakit-doctor
```

Restart or reload Pi after installation.

## Usage

Run it from inside Pi:

```text
/doctor
```

Doctor shows each check as `PASS`, `WARN`, or `FAIL`, then prints a summary. Example:

```text
Pi Rakit Doctor
[PASS] Node.js: v22.0.0 (20 or newer).
[PASS] Pi CLI: 0.x.x
[WARN] Environment: .pi/settings.json: missing OPENAI_API_KEY.
Summary: 2 passed, 1 warning(s), 0 failed.
```

## Checks

| Check | What it inspects |
| --- | --- |
| Node.js | The major version is 20 or newer |
| Pi CLI | The `pi --version` command is available and succeeds |
| Settings JSON | The file is readable, contains valid JSON, and its root is an object |
| Package settings | `packages` is an array and contains no duplicate sources |
| Environment | Variables referenced in settings are available |

Doctor checks the global and local settings that exist:

- Global: `~/.pi/agent/settings.json`
- Project: `<project>/.pi/settings.json`

If neither file exists, Doctor returns a `WARN` instead of creating a new file.

## Status Meanings

- `PASS`: the check succeeded and requires no action.
- `WARN`: the configuration is still usable, but something should be reviewed, such as duplicate packages or a missing environment variable.
- `FAIL`: a core requirement is not met or the settings are invalid.

The notification severity follows the worst result: `FAIL` produces an error notification, `WARN` produces a warning, and all `PASS` results produce an info notification.

## Troubleshooting

### Pi CLI is not available

Make sure Pi is installed and discoverable from the shell used to start Pi:

```bash
pi --version
```

### Invalid settings JSON

Open the path named in the report and fix the JSON syntax. Doctor does not repair or rewrite the file.

### Duplicate package source

Remove the duplicate entry from the `packages` array in the reported settings file. Keep one copy of each source.

### Missing environment variable

Doctor recognizes references such as `$OPENAI_API_KEY` and `${OPENAI_API_KEY}` across all settings values. Set the variable before starting Pi, for example:

```bash
export OPENAI_API_KEY="your-key"
pi
```

Do not store credentials directly in the repository. After fixing the issue, restart or reload Pi if needed and run `/doctor` again.

## Limitations

Doctor only inspects the structure and basic configuration references. A `PASS` result does not guarantee that a provider endpoint is reachable, that credentials are accepted by external services, or that a model is available.
