# Rakit UI

`pi-rakit-ui` gives Pi's interactive terminal UI one cohesive visual system without replacing or forking Pi core.

## Install

```bash
pi install npm:pi-rakit-ui
```

Reload Pi after installation. The package activates automatically in interactive TUI sessions.

## Included surfaces

- Bundled `rakit` color theme
- Compact Pi Rakit header
- Footer with working directory, Git branch, model, context use, input/output token totals, cost, thinking level, and extension statuses
- Framed editor with ready/working state
- Coordinated working indicator
- Narrow-terminal truncation and field collapse

Pi's transcript, tool renderers, and built-in pickers keep their native layout. They inherit the `rakit` palette through Pi's official theme system. Replacing those core layouts would require a Pi fork and is intentionally outside this package.

## Command

```text
/rakit-ui
/rakit-ui on
/rakit-ui off
/rakit-ui theme
```

- No argument reports current state.
- `on` reapplies all branded surfaces and captures the current theme and editor for later restoration.
- `off` restores the prior theme and editor plus Pi's built-in header, footer, and working indicator.
- `theme` reapplies only the bundled `rakit` theme.

The on/off state lasts for the current Pi process. Package installation remains unchanged.

## Diagnostics

The custom footer preserves operational data from Pi's default footer. Extension statuses registered through `ctx.ui.setStatus()` remain visible and are sorted by status key. Token and cost totals derive from assistant messages on the active session branch.

At narrow widths, low-priority text truncates before model and context data. Every rendered line stays within the width supplied by Pi.

## Compatibility

- Node.js 20+
- Pi `0.84.4`
- Pi TUI `0.84.4`

The package uses documented Pi extension and theme APIs. Extensions loaded after Rakit UI can replace the same global surfaces; package load order determines the active header, footer, editor, or indicator.

## Cleanup

Disabling Rakit UI or shutting down the session restores the captured theme and editor plus Pi's built-in header, footer, and working indicator. Footer subscriptions are disposed by Pi with the replaced component.
