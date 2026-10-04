# pi-rakit-subagent

Delegate focused tasks to child agents from inside Pi. The extension registers a
`subagent` tool the main agent can call, plus a `/subagent` command for one-off
runs.

## Install

```bash
pi install npm:pi-rakit-subagent
```

## Usage

Ask in natural language — Pi decides when to call the tool:

```text
Use the subagent reviewer to review this diff.
```

Or run a one-off from the command line:

```text
/subagent scout find where sessions are written
/subagent reviewer check the parser for edge cases
```

## Agents

| Agent | Purpose |
| --- | --- |
| `general` | Any focused task |
| `reviewer` | Strict code review: bugs, edge cases, missing tests |
| `scout` | Read-only codebase investigation |
| `planner` | Short ordered plan with risks |
| `tester` | Concrete test cases and edge cases |

## Notes

- Each child agent runs in an **in-memory session** in the current working
  directory, so it does not create session files.
- Child agents use the same tools as the main session and cost tokens and time
  like any other model call.
- The tool streams the child's answer back while it runs.
