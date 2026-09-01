# Pi Rakit Session Delete

Adds an interactive, confirmation-gated flow for deleting old Pi sessions.

```bash
pi install npm:pi-rakit-session-delete
```

Run `/session-delete`, choose a saved session, and confirm permanent deletion. The active session is always excluded, non-interactive use is rejected, and paths outside the active project's session directory are refused. Deletion is permanent.
