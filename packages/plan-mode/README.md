# Pi Rakit Plan Mode

Read-only exploration, structured planning, and tracked plan execution for [Pi](https://pi.dev/).

## Install

```bash
pi install npm:pi-rakit-plan-mode
```

Reload Pi, then toggle planning mode:

```text
/plan
```

`Ctrl+Alt+P` provides the same toggle. Start Pi in plan mode with `pi --plan`.

## Behavior

While plan mode is active:

- active tools are reduced to Pi's available `read`, `bash`, `grep`, `find`, `ls`, and `questionnaire` tools;
- every other tool call is blocked, including custom mutation tools;
- `bash` accepts one conservatively allowlisted read-only command;
- shell chaining, pipes, redirects, substitutions, and ambiguous commands are blocked;
- the model is instructed to return numbered steps under a `Plan:` heading.

After a plan is generated, choose **Execute plan**, **Stay in plan mode**, or **Refine plan**. Execution restores the exact prior tool set, shows checklist progress, and persists state in the Pi session. `/todos` shows current progress.

Plan mode is a safety guard, not an OS sandbox. Its shell policy intentionally rejects commands it cannot prove read-only.
