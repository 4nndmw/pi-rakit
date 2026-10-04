# pi-rakit-subagent

Delegate focused tasks to child agents from inside Pi.

## Install

```bash
pi install npm:pi-rakit-subagent
```

## Tools

| Tool | Purpose |
| --- | --- |
| `subagent` | Run one focused task (set `background: true` to run without blocking) |
| `subagents` | Run several tasks in parallel |
| `subagent_jobs` | List background jobs and their status |
| `subagent_result` | Fetch the output of a background job by id |

## Commands

```text
/subagent [agent] <task>     run a one-off task
/subagent-jobs               list background jobs
```

Ask in natural language — Pi decides when to call the tool:

```text
Use the subagent reviewer to review this diff.
Run parallel reviewers: one for correctness, one for tests, one for complexity.
```

## Built-in agents

| Agent | Purpose | Tools |
| --- | --- | --- |
| `general` | Any focused task | default |
| `reviewer` | Strict code review: bugs, edge cases, missing tests | read-only |
| `scout` | Read-only codebase investigation | read-only |
| `planner` | Short ordered plan with risks | read-only |
| `tester` | Concrete test cases and edge cases | read-only |

## Custom agents

Create `~/.pi/agent/subagent/agents.json` (or point `PI_RAKIT_SUBAGENT_CONFIG` at
another file):

```json
{
  "defaultAgent": "general",
  "concurrency": 4,
  "agents": {
    "architect": {
      "label": "Architect",
      "instructions": "You design systems and call out trade-offs.",
      "tools": ["read", "grep", "find", "ls"],
      "model": "openai/gpt-4o"
    }
  }
}
```

- `agents` adds or overrides roles (built-ins stay available).
- `tools` restricts the child to an allowlist of tool names.
- `model` selects a specific `provider/model-id` for that role.
- `defaultAgent` sets the fallback role; `concurrency` caps parallel children.

## Notes

- Each child runs in an **in-memory session** in the current working directory.
- Children cost tokens and time like any other model call.
- Background jobs live for the current Pi session only.
