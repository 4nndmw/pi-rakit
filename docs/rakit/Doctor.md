# Doctor

Pi Rakit Doctor menjalankan pemeriksaan kesehatan Pi tanpa mengubah settings, package, atau environment variable.

## Instalasi

Pilih **Doctor** saat menjalankan installer:

```bash
npx pi-rakit@latest
```

Atau instal langsung:

```bash
pi install npm:pi-rakit-doctor
```

Mulai atau reload Pi setelah instalasi.

## Penggunaan

Jalankan dari dalam Pi:

```text
/doctor
```

Doctor menampilkan setiap pemeriksaan sebagai `PASS`, `WARN`, atau `FAIL`, lalu memberikan ringkasan. Contoh:

```text
Pi Rakit Doctor
[PASS] Node.js: v22.0.0 (20 or newer).
[PASS] Pi CLI: 0.x.x
[WARN] Environment: .pi/settings.json: missing OPENAI_API_KEY.
Summary: 2 passed, 1 warning(s), 0 failed.
```

## Pemeriksaan

| Pemeriksaan | Hasil yang diperiksa |
| --- | --- |
| Node.js | Versi utama adalah 20 atau lebih baru |
| Pi CLI | Perintah `pi --version` tersedia dan berhasil |
| Settings JSON | File dapat dibaca, berisi JSON valid, dan root-nya berupa object |
| Package settings | `packages` berupa array dan tidak berisi source duplikat |
| Environment | Variable yang direferensikan dalam settings tersedia |

Doctor memeriksa settings global dan lokal yang ada:

- Global: `~/.pi/agent/settings.json`
- Project: `<project>/.pi/settings.json`

Jika kedua file tidak ditemukan, Doctor memberikan `WARN`, bukan membuat file baru.

## Arti Status

- `PASS`: pemeriksaan berhasil dan tidak memerlukan tindakan.
- `WARN`: konfigurasi masih dapat digunakan, tetapi ada kondisi yang perlu ditinjau, seperti package duplikat atau environment variable yang belum tersedia.
- `FAIL`: persyaratan utama tidak terpenuhi atau settings tidak valid.

Severity notifikasi mengikuti hasil terburuk: `FAIL` menghasilkan notifikasi error, `WARN` menghasilkan warning, dan seluruh hasil `PASS` menghasilkan info.

## Pemecahan Masalah

### Pi CLI tidak tersedia

Pastikan Pi telah terinstal dan dapat ditemukan dari shell yang digunakan untuk memulai Pi:

```bash
pi --version
```

### Settings JSON tidak valid

Buka path yang disebutkan dalam laporan dan perbaiki syntax JSON. Doctor tidak memperbaiki atau menulis ulang file tersebut.

### Package source duplikat

Hapus entri yang sama dari array `packages` pada file settings yang disebutkan. Simpan satu salinan untuk setiap source.

### Environment variable hilang

Doctor mengenali referensi seperti `$OPENAI_API_KEY` dan `${OPENAI_API_KEY}` di seluruh nilai settings. Atur variable sebelum memulai Pi, misalnya:

```bash
export OPENAI_API_KEY="your-key"
pi
```

Jangan menyimpan credential langsung di repository. Setelah memperbaiki masalah, restart atau reload Pi jika diperlukan lalu jalankan `/doctor` kembali.

## Batasan

Doctor hanya memeriksa struktur dan referensi konfigurasi dasar. Hasil `PASS` tidak menjamin endpoint provider dapat dijangkau, credential diterima oleh layanan eksternal, atau model tersedia.
