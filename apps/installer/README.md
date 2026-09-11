# Pi Rakit

Installer interaktif untuk memilih dan memasang kumpulan ekstensi Pi.

```bash
npx @4nndmw/pi-rakit --version
npx @4nndmw/pi-rakit
npx @4nndmw/pi-rakit --list-packages
npx @4nndmw/pi-rakit --list-packages --json
npx @4nndmw/pi-rakit --local --package ponytail --package caveman --dry-run
npx @4nndmw/pi-rakit --local --package ponytail --package caveman --dry-run --json
npx @4nndmw/pi-rakit --local --package ponytail --package caveman --check --json --output reports/@4nndmw/pi-rakit.json
npx @4nndmw/pi-rakit --local --package ponytail --package caveman --yes
```

Gunakan `--package <id>` berulang kali untuk memilih package tertentu tanpa prompt interaktif. Tambahkan `--dry-run` untuk melihat perubahan tanpa menulis settings atau menjalankan instalasi. Gunakan `--check` di CI untuk keluar dengan status nonzero jika settings belum lengkap. Tambahkan `--json` ke `--list-packages`, `--dry-run`, atau `--check` untuk output yang dapat diproses program. Gunakan `--output <path>` bersama `--json` untuk menulis hasil ke file. Jalankan `npx @4nndmw/pi-rakit --help` untuk melihat semua opsi.
