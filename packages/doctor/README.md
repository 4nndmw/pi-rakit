# Pi Rakit Doctor

A read-only health check extension for [Pi](https://pi.dev/). It checks the Node.js runtime, Pi CLI availability, global and project settings JSON, duplicate package sources, and missing environment variables referenced by settings.

## Install

```bash
pi install npm:pi-rakit-doctor
```

Or select **Doctor** in the Pi Rakit installer.

## Usage

Run this command inside Pi:

```text
/doctor
```

Each check is reported as `PASS`, `WARN`, or `FAIL`, followed by a summary. Doctor never modifies settings, packages, or environment variables.

## Requirements

- Node.js 20+
- Pi

## License

Choose and add a license before public distribution.
