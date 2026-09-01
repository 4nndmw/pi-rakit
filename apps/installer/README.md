# Pi Rakit

Installer interaktif untuk memilih dan memasang kumpulan ekstensi Pi.

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

Gunakan `--package <id>` berulang kali untuk memilih package tertentu tanpa prompt interaktif. Tambahkan `--dry-run` untuk melihat perubahan tanpa menulis settings atau menjalankan instalasi. Gunakan `--check` di CI untuk keluar dengan status nonzero jika settings belum lengkap. Tambahkan `--json` ke `--list-packages`, `--dry-run`, atau `--check` untuk output yang dapat diproses program. Gunakan `--output <path>` bersama `--json` untuk menulis hasil ke file. Jalankan `npx pi-rakit --help` untuk melihat semua opsi.
