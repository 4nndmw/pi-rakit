# Pi Open TUI

Pi Rakit's polished terminal UI package, adapted from the `pi-open-tui` design: branded header, responsive footer, framed editor, working indicator, usage telemetry, and a configurable `/open-tui` command.

## Install

```bash
pi install npm:pi-open-tui
```

For local development from this repository:

```bash
pi -e ./packages/open-tui
```

Use `/open-tui` to toggle the UI or inspect the current configuration. Settings are stored in `~/.pi/agent/open-tui.json`.

The package requires Pi 0.87.1 or newer and Node.js 20 or newer.
