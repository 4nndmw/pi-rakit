# Creating an Extension

Pi Rakit includes `pi-rakit-hello` as a minimal extension example. Its source is located at:

```text
packages/hello-pi/
├── extensions/
│   └── index.js
├── package.json
└── README.md
```

## Minimal Command Extension

An extension exports a function that receives the Pi API:

```js
export default function myExtension(pi) {
  pi.registerCommand("greet", {
    description: "Display a greeting",
    handler: async (args, ctx) => {
      const name = args.trim() || "developer";
      ctx.ui.notify(`Hello, ${name}!`, "info");
    },
  });
}
```

This registers `/greet` in Pi. Command arguments are passed to `handler` as a string.

## Package Metadata

A publishable extension package needs Pi metadata in `package.json`:

```json
{
  "name": "my-pi-extension",
  "version": "0.1.0",
  "type": "module",
  "private": false,
  "files": ["extensions", "README.md"],
  "pi": {
    "extensions": ["./extensions"]
  },
  "engines": {
    "node": ">=20"
  }
}
```

Use a unique npm package name. Keep the `files` list narrow so source unrelated to the runtime package is not published.

## Add the Extension to Pi Rakit

1. Copy `packages/hello-pi` to a new workspace directory.
2. Update its package name, description, README, and implementation.
3. Add a workspace entry to the root `manifest.json`:

```json
{
  "id": "my-extension",
  "label": "My Extension",
  "description": "Describe what the extension does.",
  "category": "Utilities",
  "enabledByDefault": false,
  "tags": ["utility"],
  "source": {
    "mode": "workspace",
    "path": "packages/my-extension",
    "npm": "my-pi-extension"
  }
}
```

4. Add `packages/my-extension` to `PUBLISH_WORKSPACES` in `scripts/publish-npm.mjs` if this repository will publish it.
5. Synchronize and validate:

```bash
npm install
npm run manifest:sync
npm run check
```

## Test Locally

Use development mode to load workspace paths without publishing:

```bash
node apps/installer/src/cli.js \
  --local \
  --dev \
  --select-all \
  --yes \
  --write-only
```

Inspect `.pi/settings.json`, start Pi in the project, and exercise the new command or behavior.

Continue with [[Development and Release]] when the extension is ready to publish.
