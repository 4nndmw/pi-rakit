# Pi Rakit Compact Tools

Makes built-in read, bash, edit, write, grep, find, and ls output compact and easier to scan in Pi's interactive UI.

```bash
pi install npm:pi-rakit-compact-tools
```

Do not install this package together with `@gnoviawan/pi-compact-tool-preview`; both replace the same built-in tools. If the preview package is already installed, remove it first:

```bash
pi uninstall npm:@gnoviawan/pi-compact-tool-preview
```

Collapsed results show a short success/error summary and line count. Expand a tool result to inspect up to 20 output lines. Tool parameters, execution, model-visible results, cancellation, and permissions remain unchanged; only the interactive renderer is replaced.
