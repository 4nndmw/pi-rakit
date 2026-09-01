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

Before the version bump, add a dated entry for the affected workspace to [`CHANGELOG.md`](../../CHANGELOG.md). Describe user-visible changes and keep release notes grouped by package because workspace versions are independent.

## Publish to npm

Authenticate first:

```bash
npm login
npm whoami
```

For accounts using npm web authentication, `npm publish` prints an authentication URL. Open that URL, approve the operation in the browser, and return to the terminal. Browser authentication is preferred for this repository; do not share or commit OTP values, npm tokens, or authentication URLs.

Run final checks:

```bash
npm run publish:npm:dry
```

Publish the configured workspaces in order:

```bash
npm run publish:npm
```

The script currently publishes extension workspaces before the installer so the manifest does not point users to an unavailable package.

If publishing several workspaces, npm may request browser approval for each publish operation. Never commit npm tokens, one-time passwords, or temporary authentication URLs.

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

After validation, commit only the intended files and push the `main` branch:

```bash
git status
git add <changed-files>
git commit -m "Describe the change"
git push origin main
```

See [[Creating an Extension]] for the extension development workflow.
