# Git

Pi Rakit Git provides a deliberately small `/git` command for common repository checks and confirmation-gated commits.

## Install

Select **Git** in Pi Rakit, or install it directly:

```bash
pi install npm:pi-rakit-git
```

Restart Pi after installation.

## Inspect the Repository

```text
/git status
/git branch
```

`status` displays Git's short status including branch information. `branch` displays the current branch, or `detached at <commit>` for a detached HEAD.

## Commit Staged Changes

First review and stage files outside the extension:

```bash
git diff
git add path/to/file
git diff --cached
```

Then provide a commit message:

```text
/git commit Explain the staged change
```

Choose **Commit** in the confirmation dialog. Choosing **Cancel** performs no Git mutation.

## Safety Boundaries

- Only already-staged changes are committed.
- An empty index is rejected.
- Git hooks remain enabled.
- The command does not push, reset, clean, force, delete branches, or stage files.
- Errors from Git are shown in Pi without retrying destructively.

## Troubleshooting

- **`No staged changes to commit.`** Stage the intended paths, review `git diff --cached`, and retry.
- **`Commit message is required.`** Add text after `/git commit`.
- **`not a git repository`** Start Pi from inside a Git worktree.
- **A hook rejects the commit.** Fix the reported issue and retry; hooks are never bypassed.
