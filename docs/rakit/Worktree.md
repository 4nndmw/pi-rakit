# Worktree

`pi-rakit-worktree` adds a `/worktree` command to Pi for managing isolated Git worktrees without leaving the Pi session.

A Git worktree gives a branch its own working directory. This is useful when you want to work on another task without stashing or replacing the files in your current checkout.

## Install

Install the extension directly:

```bash
pi install npm:pi-rakit-worktree
```

Alternatively, run the Pi Rakit installer and select **Worktree**:

```bash
npx pi-rakit@latest --install
```

Start or reload Pi after installation so the command is available.

## List Worktrees

Run this command from Pi while Pi is operating inside a Git repository:

```text
/worktree list
```

Each entry shows its branch and absolute directory, for example:

```text
main
  /home/user/projects/my-app
worktree/issue-123
  /home/user/projects/my-app-issue-123
```

A worktree without a local branch is displayed as `detached`.

## Create a Worktree

```text
/worktree create issue-123
```

For a repository located at `/home/user/projects/my-app`, this creates:

| Item | Result |
| --- | --- |
| Branch | `worktree/issue-123` |
| Directory | `/home/user/projects/my-app-issue-123` |
| Starting commit | Current `HEAD` |

The name can contain letters, numbers, dots, underscores, and hyphens. It must start with a letter or number. Names containing spaces or slashes are not accepted.

Creation is rejected when:

- the current worktree contains tracked or untracked changes;
- the generated branch already exists;
- the target directory cannot be created;
- the name is `main` or `master`.

After creation, open the directory printed by Pi in another terminal or Pi session:

```bash
cd ../my-app-issue-123
pi
```

## Remove a Worktree

```text
/worktree remove issue-123
```

Pi asks you to choose **Remove** or **Cancel**. Removal succeeds only when the matching `worktree/issue-123` worktree exists and has no tracked or untracked changes.

This command removes the additional working directory but deliberately preserves the branch. If the branch is no longer needed, inspect and delete it separately with Git:

```bash
git branch --list worktree/issue-123
git branch -d worktree/issue-123
```

The extension never uses forced worktree removal and cannot remove the worktree in which the command is currently running.

## Suggested Workflow

```text
/worktree create issue-123
```

Work and commit inside the generated directory, then return to the original repository and run:

```text
/worktree list
/worktree remove issue-123
```

Finally, merge or delete `worktree/issue-123` using your normal Git workflow.

## Troubleshooting

### `Current worktree has uncommitted changes.`

Commit, stash, or remove all tracked and untracked changes in the current repository, then retry creation. Check with:

```bash
git status --short
```

### `Target worktree has uncommitted changes.`

Open the target directory shown by `/worktree list`, then commit, stash, or remove its changes before retrying removal.

### `Branch already exists: worktree/<name>`

Choose another name. The extension does not attach a new worktree to an existing branch.

### `Worktree not found for branch worktree/<name>.`

Run `/worktree list` and use the name after the `worktree/` prefix. Worktrees attached to branches with other naming patterns can be listed but are not removed by this command.

## Safety Summary

- `main` and `master` are protected names.
- Creation requires a clean current worktree.
- Removal requires a clean target worktree and explicit confirmation.
- Removal does not use `--force`.
- Removal preserves the branch.
