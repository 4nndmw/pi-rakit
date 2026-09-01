# Pi Rakit

Monorepo untuk merakit, memilih, dan memasang kumpulan ekstensi Pi melalui installer interaktif. Proyek ini ditujukan terutama untuk komunitas Indonesia.

## Requirements

- Node.js 20+
- npm 11+
- Pi installed and available as `pi`

## Paket

- `pi-rakit`: installer CLI utama
- `pi-rakit-hello`: ekstensi contoh dengan perintah `/hello`

Sebelum publikasi, lengkapi metadata repository, author, dan lisensi sesuai kebutuhan.

## Development

```bash
npm install
npm test
npm run check
```

Test the installer against the current project without publishing:

```bash
node apps/installer/src/cli.js --local --dev --select-all --yes --write-only
```

This writes workspace-relative package sources to `.pi/settings.json`. Remove that file after testing if you do not want local Pi settings committed.

## Use after publishing

```bash
npx pi-rakit
# atau pasang hanya untuk proyek saat ini
npx pi-rakit --local
```

By default the CLI only updates Pi settings. Add `--install` to also invoke `pi install` for each selected package.

## Publish

First authenticate and verify the package names:

```bash
npm login
npm whoami
npm view pi-rakit
npm run publish:npm:dry
```

Then publish all public workspaces:

```bash
npm run publish:npm
```

Publishing is intentionally not automatic. Update versions before each subsequent release.

## Add another extension

1. Copy `packages/hello-pi` to a new directory.
2. Change its npm name and extension implementation.
3. Add it to `manifest.json`.
4. Add its workspace path to `PUBLISH_WORKSPACES` in `scripts/publish-npm.mjs`.
5. Run `npm run check`.

## License

Choose and add a license before public distribution.
