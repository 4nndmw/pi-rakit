# Pi Rakit Session Usage

Shows token usage for the current session and all saved sessions in the current project.

```bash
pi install npm:pi-rakit-session-usage
```

Run `/usage` for input, output, cache, and provider-reported cost totals. A compact current-session token total also appears in the status bar. Corrupt or incomplete history lines are skipped safely.

Run `/tokens` to open an overlay dashboard with four tabs:

- **Summary** — current session and project totals: input, output, cache (read/write), total tokens, cost, and cache hit rate
- **Models** — usage grouped by `provider/model`, sorted by total tokens
- **Daily** — usage grouped by day
- **Sessions** — saved sessions ranked by total tokens

Switch tabs with `←`/`→` or `1`-`4`, scroll with `↑`/`↓` (or PgUp/PgDn), and close with `Q`/`Esc`.
