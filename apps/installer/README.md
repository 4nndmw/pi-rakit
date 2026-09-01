# Pi Rakit

Installer interaktif untuk memilih dan memasang kumpulan ekstensi Pi.

```bash
npx pi-rakit --version
npx pi-rakit
npx pi-rakit --list-packages
npx pi-rakit --list-packages --json
npx pi-rakit --local --package ponytail --package caveman --dry-run
npx pi-rakit --local --package ponytail --package caveman --yes
```

Gunakan `--package <id>` berulang kali untuk memilih package tertentu tanpa prompt interaktif. Tambahkan `--dry-run` untuk melihat perubahan tanpa menulis settings atau menjalankan instalasi. Tambahkan `--json` ke `--list-packages` untuk output yang dapat diproses program. Jalankan `npx pi-rakit --help` untuk melihat semua opsi.
