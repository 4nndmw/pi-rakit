# Plan Mode

Pi Rakit Plan Mode adds read-only exploration, numbered planning, and tracked plan execution to Pi.

## Install

```bash
pi install npm:pi-rakit-plan-mode
```

Reload Pi after installation.

## Commands and startup

```text
/plan
/todos
```

- `/plan` toggles plan mode.
- `/todos` shows active execution progress.
- `Ctrl+Alt+P` toggles plan mode.
- `pi --plan` starts a session in plan mode.

## Planning flow

1. Enable plan mode.
2. Ask Pi to investigate or design a change.
3. Pi explores with read-only tools and returns numbered steps under `Plan:`.
4. Choose **Execute plan**, **Stay in plan mode**, or **Refine plan**.
5. During execution, the prior tool set is restored and checklist progress appears in the UI.

Plan state and `[DONE:n]` completion markers persist in the Pi session.

## Read-only guard

While active, Plan Mode limits active tools to available `read`, `bash`, `grep`, `find`, `ls`, and `questionnaire` tools. It also blocks every other tool call at the lifecycle hook, including custom mutation tools.

Shell access uses a conservative allowlist. One read-only command is accepted. Chaining, pipes, redirects, substitutions, mutation flags, scripts, network commands, and unknown commands are rejected. Disable plan mode before running required mutations.

Plan Mode reduces accidental changes but is not an OS sandbox. A third-party tool with misleading read-only semantics remains outside the extension's control; only allowlisted tool names remain active.

## Troubleshooting

- **Needed command blocked:** use a dedicated Pi read tool, simplify to one allowlisted command, or disable plan mode.
- **No execution prompt:** ensure the response contains a `Plan:` heading followed by numbered steps.
- **Expected tools missing after toggle:** toggle plan mode off. The exact tool set captured before activation is restored.
- **Shortcut unavailable:** run `/plan`; terminal key handling can intercept `Ctrl+Alt+P`.
