# Pi Rakit

Interactive installer to select and install a set of Pi extensions.

```bash
npx pi-rakit --version
npx pi-rakit
npx pi-rakit --list-packages
npx pi-rakit --list-packages --json
npx pi-rakit --local --package ponytail --package caveman --dry-run
npx pi-rakit --local --package ponytail --package caveman --dry-run --json
npx pi-rakit --local --package ponytail --package caveman --check --json --output reports/pi-rakit.json
npx pi-rakit --local --package ponytail --package caveman --yes
```

Use `--package <id>` repeatedly to select specific packages without an interactive prompt. Add `--dry-run` to preview changes without writing settings or running an install. Use `--check` in CI to exit with a non-zero status when settings are incomplete. Add `--json` to `--list-packages`, `--dry-run`, or `--check` for machine-readable output. Use `--output <path>` together with `--json` to write the result to a file. Run `npx pi-rakit --help` to see all options.
