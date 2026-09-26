# Package Manifest

The root `manifest.json` defines the packages available in Pi Rakit. The release workflow copies it to `apps/installer/manifest.json`, which is included in the published CLI package.

## Basic Structure

```json
{
  "version": 1,
  "packages": [
    {
      "id": "hello-pi",
      "label": "Hello Pi",
      "description": "Example extension that adds a /hello command.",
      "category": "Starter",
      "enabledByDefault": true,
      "tags": ["example", "command"],
      "source": {
        "mode": "workspace",
        "path": "packages/hello-pi",
        "npm": "pi-rakit-hello"
      }
    }
  ]
}
```

The only supported manifest version is `1`.

## Package Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Unique identifier used by selection and dependency resolution. |
| `label` | Yes | Human-readable name displayed by the installer. |
| `description` | Recommended | Short explanation shown in the package selector. |
| `category` | Optional | Display grouping or package classification. |
| `enabledByDefault` | Optional | Select the package initially in interactive mode. |
| `hidden` | Optional | Exclude the package from interactive and `--select-all` selection. |
| `tags` | Optional | Descriptive metadata. |
| `requires` | Optional | Array of package IDs that must be included first. |
| `source` | Yes | Workspace or npm source configuration. |

Every `requires` ID must exist in the same manifest. Circular requirements are rejected when an installation plan is built.

## Workspace Sources

Use workspace mode for an extension developed in this monorepo:

```json
{
  "source": {
    "mode": "workspace",
    "path": "packages/my-extension",
    "npm": "my-published-package"
  }
}
```

- In normal mode, Pi Rakit writes `npm:my-published-package`.
- In `--dev` mode, it writes a relative path to `packages/my-extension`.

Both `path` and `npm` are required.

## npm Sources

Use npm mode for an external package:

```json
{
  "source": {
    "mode": "npm",
    "name": "some-pi-extension",
    "version": "1.2.3"
  }
}
```

The generated source is:

```text
npm:some-pi-extension@1.2.3
```

The `version` field is optional. Without it, Pi Rakit writes `npm:some-pi-extension`.

## Package Requirements

A package can depend on other manifest entries:

```json
{
  "id": "feature-package",
  "label": "Feature Package",
  "requires": ["base-package"],
  "source": {
    "mode": "npm",
    "name": "feature-package"
  }
}
```

Selecting `feature-package` automatically adds `base-package` first.

## Synchronizing the Published Manifest

After editing the root manifest, run:

```bash
npm run manifest:sync
```

Do not edit `apps/installer/manifest.json` independently; it is generated from the root manifest. Run `npm run check` before publishing.
