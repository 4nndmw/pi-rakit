# Pi Rakit Worktree

A Pi extension for safely listing, creating, and removing Git worktrees without leaving your coding session.

## Install

```bash
pi install npm:pi-rakit-worktree
```

Or select **Worktree** in the Pi Rakit installer.

## Usage

```text
/worktree list
/worktree create issue-123
/worktree remove issue-123
```

Creating `issue-123` creates branch `worktree/issue-123` in a sibling directory named `<repository>-issue-123`.

## Safety

- Names are restricted to letters, numbers, dots, underscores, and hyphens.
- `main` and `master` are protected names.
- Creation requires the current worktree to be clean.
- Removal requires explicit confirmation and a clean target worktree.
- Removal never uses `--force` and preserves the Git branch.

## Requirements

- Node.js 20+
- Git
- Pi
