# Pi Rakit UI

A global visual system for Pi: bundled `rakit` theme, compact branded header, information-dense footer, framed editor, and matching working indicator.

## Install

```bash
pi install npm:pi-rakit-ui
```

The package activates its theme and UI when an interactive session starts. Built-in transcript and picker layouts remain native Pi components and inherit the bundled theme.

## Commands

- `/rakit-ui` — show current state
- `/rakit-ui on` — enable all UI surfaces
- `/rakit-ui off` — restore Pi defaults and the previous theme
- `/rakit-ui theme` — reapply the bundled `rakit` theme

The footer preserves model, branch, context, token, cost, working-directory, and extension-status information. Very narrow terminals collapse low-priority fields before truncation.

## Compatibility

Requires Node.js 20+ and Pi `0.84.4`. Extensions loaded later can replace the same global UI surfaces; package load order determines the active implementation.
