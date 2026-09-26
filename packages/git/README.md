# Pi Rakit Git

A focused Pi extension for inspecting Git state and committing changes that you explicitly staged.

## Requirements

- Node.js 20+
- Git
- Pi
- A Git repository

## Install

```bash
pi install npm:pi-rakit-git
```

Or run `npx pi-rakit@latest --install` and select **Git**. Start or reload Pi after installation.

## Commands

```text
/git status
/git branch
/git commit Explain the staged change
```

- `status` shows `git status --short --branch`.
- `branch` shows the current branch, or the short commit when HEAD is detached.
- `commit` asks for confirmation and runs `git commit -m` using the supplied message.

## Safety

`/git commit` never stages files. Review and stage exactly what you want with your normal workflow before invoking it. The command refuses to create a commit when the index is empty and does not bypass Git hooks.

The extension does not expose push, reset, clean, force, or branch-deletion operations.
