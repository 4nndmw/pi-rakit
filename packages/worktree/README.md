# Pi Rakit Worktree

A Pi extension for safely listing, creating, and removing Git worktrees without leaving your coding session.

## Requirements

- Node.js 20+
- Git
- Pi
- A Git repository

## Install

Install directly:

```bash
pi install npm:pi-rakit-worktree
```

Or run the Pi Rakit installer and select **Worktree**:

```bash
npx pi-rakit@latest --install
```

Start or reload Pi after installation.

## Commands

### List worktrees

```text
/worktree list
```

The result includes each branch and its absolute directory:

```text
main
  /home/user/projects/my-app
worktree/issue-123
  /home/user/projects/my-app-issue-123
```

### Create a worktree

```text
/worktree create issue-123
```

When the current repository is `/home/user/projects/my-app`, the command creates:

- Branch: `worktree/issue-123`
- Directory: `/home/user/projects/my-app-issue-123`
- Starting point: the current `HEAD`

Open the generated sibling directory in another terminal or Pi session:

```bash
cd ../my-app-issue-123
pi
```

Names may contain letters, numbers, dots, underscores, and hyphens, and must start with a letter or number. Spaces and slashes are not accepted.

### Remove a worktree

```text
/worktree remove issue-123
```

Select **Remove** in the confirmation dialog. This removes the additional working directory but preserves branch `worktree/issue-123`. Delete the branch separately only after reviewing or merging it:

```bash
git branch -d worktree/issue-123
```

## Example Workflow

1. Make sure the current repository is clean with `git status --short`.
2. Run `/worktree create issue-123` in Pi.
3. Work and commit in the generated `<repository>-issue-123` directory.
4. Return to the original repository and run `/worktree remove issue-123`.
5. Merge or delete `worktree/issue-123` with your normal Git workflow.

## Safety

- `main` and `master` are protected names.
- Creation requires the current worktree to have no tracked or untracked changes.
- Creation refuses to reuse an existing `worktree/<name>` branch.
- Removal requires explicit confirmation and a clean target worktree.
- The current worktree cannot remove itself.
- Removal never uses `--force` and preserves the Git branch.

## Troubleshooting

- **`Current worktree has uncommitted changes.`** Commit, stash, or remove changes in the current repository before creating a worktree.
- **`Target worktree has uncommitted changes.`** Commit, stash, or remove changes in the target directory before removing it.
- **`Branch already exists: worktree/<name>`** Choose another name; existing branches are not reused.
- **`Worktree not found for branch worktree/<name>.`** Run `/worktree list` and pass only the part after `worktree/`.

See the full [Worktree guide](https://github.com/4nndmw/pi-rakit/blob/main/docs/rakit/Worktree.md) for detailed behavior and examples.
