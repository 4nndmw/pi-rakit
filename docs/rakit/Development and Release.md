# Development and Release

## Repository Layout

```text
pi-rakit/
├── apps/installer/          # Published pi-rakit CLI
│   ├── src/                 # CLI implementation
│   └── test/                # Installer unit tests
├── packages/hello-pi/       # Example Pi extension
├── scripts/                 # Manifest and publishing scripts
├── docs/rakit/              # Project documentation
├── manifest.json            # Source package catalog
└── package.json             # npm workspace root
```

The root package is intentionally private. Publish workspace packages, not the monorepo root.

## Install Dependencies

```bash
npm install
```

## Validation

Run unit tests:

```bash
npm test
```

Run the complete project check:

```bash
npm run check
```

The complete check verifies that the installer manifest is synchronized, runs tests, and performs npm package dry runs for the configured workspaces. It does not modify files. If the manifest check fails, synchronize it explicitly and rerun validation:

```bash
npm run manifest:sync
npm run check
```

GitHub Actions runs the same check with Node.js 20 and 22 for every push and pull request. CI installs the npm version declared by the root `packageManager` field before running `npm ci`.

To inspect the publishing sequence without releasing anything:

```bash
npm run publish:npm:dry
```

## Local CLI Smoke Test

```bash
tmpdir=$(mktemp -d)
node apps/installer/src/cli.js \
  --cwd "$tmpdir" \
  --local \
  --dev \
  --select-all \
  --yes \
  --write-only
cat "$tmpdir/.pi/settings.json"
```

This does not run `pi install` and does not modify the repository settings.

## Versioning

npm package versions are immutable. Increment every changed workspace before publishing:

```bash
npm version patch --workspace packages/hello-pi --no-git-tag-version
npm version patch --workspace apps/installer --no-git-tag-version
npm install --package-lock-only --ignore-scripts
```

Only increment a package that changed. Use `minor` or `major` instead of `patch` when appropriate.

The root MIT license is copied into every public workspace. After changing `LICENSE`, update and verify those copies:

```bash
npm run license:sync
npm run license:check
```

Before the version bump, add a dated entry for the affected workspace to [`CHANGELOG.md`](../../CHANGELOG.md). Describe user-visible changes and keep release notes grouped by package because workspace versions are independent.

## Trusted Publishing Setup

The manual [`publish.yml`](../../.github/workflows/publish.yml) workflow publishes through npm Trusted Publishing and GitHub OIDC. It does not use an npm token or OTP. An npm package owner must configure this once for every public package:

1. Open the package on npm and go to **Settings → Trusted Publisher**.
2. Choose **GitHub Actions**.
3. Enter owner `4nndmw`, repository `pi-rakit`, workflow filename `publish.yml`, and environment `npm-publish`.
4. Save the publisher.

Configure the same publisher for:

- `pi-rakit`
- `pi-rakit-hello`
- `pi-rakit-custom-provider`
- `pi-rakit-doctor`
- `pi-rakit-worktree`
- `pi-rakit-git`

All values are identity constraints and must match exactly. The workflow requests only `contents: read` and `id-token: write`. The `npm-publish` GitHub environment can additionally require reviewers in repository settings before a job is allowed to publish.

## Publish to npm

First, merge the package version and changelog entry into `main`. Run the final dry-run locally:

```bash
npm run publish:npm:dry
```

Then open **Actions → Publish npm package → Run workflow**, choose the changed workspace, select the `main` branch, and run it. The workflow validates the repository before executing one `npm publish --provenance`. Publish extension packages before an installer release that starts referring to them.

Each workflow run publishes exactly one workspace. This avoids attempting to republish unchanged immutable versions. A release remains manual and will fail safely if the selected version already exists or its Trusted Publisher is not configured.

For emergency local publishing, use npm's browser authentication flow. Never commit npm tokens, one-time passwords, or temporary authentication URLs.

## Verify a Release

Confirm that the registry version and `latest` tag match the source version, then verify the package behavior:

```bash
npm view pi-rakit version dist-tags.latest
npm view pi-rakit-hello version dist-tags.latest
npx --yes pi-rakit@latest --help
```

For an end-to-end test, run Pi Rakit in a temporary directory:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
npx --yes pi-rakit@latest --local --select-all --yes --write-only
cat .pi/settings.json
```

## GitHub Workflow

After validation, commit only the intended files on a branch, open a pull request, and merge it after CI succeeds. Do not push release changes directly to `main`.

See [[Creating an Extension]] for the extension development workflow.
