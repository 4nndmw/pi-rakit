# Pi Rakit Doctor

A read-only health check extension for [Pi](https://pi.dev/). It checks the Node.js runtime, Pi CLI availability, global and project settings JSON, duplicate package sources, and missing environment variables referenced by settings.

## Install

```bash
pi install npm:pi-rakit-doctor
```

Or select **Doctor** in the Pi Rakit installer.

## Usage

Start or reload Pi after installation, then run:

```text
/doctor
```

Each check is reported as `PASS`, `WARN`, or `FAIL`, followed by a summary. Doctor checks:

- Node.js 20 or newer and availability of `pi --version`
- Global settings at `~/.pi/agent/settings.json`
- Project settings at `<project>/.pi/settings.json`
- Valid JSON object structure and a valid `packages` array
- Duplicate package sources
- Missing environment variables referenced as `$NAME` or `${NAME}`

Doctor never modifies settings, packages, or environment variables. A missing settings file produces a warning; malformed JSON and unavailable runtime requirements produce failures.

## Troubleshooting

Use the path and message in each result to locate the problem. Fix invalid JSON manually, remove duplicate entries from `packages`, or export missing variables before restarting Pi. For example:

```bash
export OPENAI_API_KEY="your-key"
pi
```

Do not commit credentials. A successful Doctor report verifies basic local configuration, but does not test provider connectivity or external credentials.

See the [complete Doctor guide](https://github.com/4nndmw/pi-rakit/blob/main/docs/rakit/Doctor.md).

## Requirements

- Node.js 20+
- Pi

## License

Choose and add a license before public distribution.
