# Custom Provider

Pi Rakit Custom Provider mendaftarkan satu provider dan satu model OpenAI-compatible di Pi. Extension ini dapat digunakan dengan server lokal seperti Ollama, llama.cpp, dan vLLM, atau dengan gateway hosted yang menyediakan endpoint OpenAI-compatible.

## Instalasi

Pilih **Custom Provider** saat menjalankan installer:

```bash
npx pi-rakit@latest
```

Atau instal langsung:

```bash
pi install npm:pi-rakit-custom-provider
```

## Penggunaan Default dengan Ollama

Konfigurasi default mengarah ke:

- Provider ID: `rakit-openai`
- Base URL: `http://localhost:11434/v1`
- Model: `llama3.2`
- API: `openai-completions`

Pastikan Ollama berjalan dan model tersedia:

```bash
ollama pull llama3.2
ollama serve
```

Mulai atau reload Pi, jalankan `/model`, lalu pilih:

```text
rakit-openai/llama3.2
```

## Hosted Gateway

Atur konfigurasi sebelum memulai Pi:

```bash
export PI_RAKIT_PROVIDER_BASE_URL="https://api.example.com/v1"
export PI_RAKIT_PROVIDER_API_KEY="your-secret-key"
export PI_RAKIT_PROVIDER_MODEL="your-model-id"
pi
```

Kemudian pilih `rakit-openai/your-model-id` melalui `/model`.

Konfigurasi dibaca ketika extension dimuat. Setelah mengubah environment variable, restart atau reload Pi.

## Environment Variable

| Variable | Default | Keterangan |
| --- | --- | --- |
| `PI_RAKIT_PROVIDER_ID` | `rakit-openai` | ID provider yang digunakan pada pilihan model |
| `PI_RAKIT_PROVIDER_NAME` | `Pi Rakit OpenAI Compatible` | Nama tampilan provider |
| `PI_RAKIT_PROVIDER_BASE_URL` | `http://localhost:11434/v1` | Base URL endpoint OpenAI-compatible |
| `PI_RAKIT_PROVIDER_API_KEY` | tidak diatur | Credential yang diselesaikan Pi saat request dibuat |
| `PI_RAKIT_PROVIDER_MODEL` | `llama3.2` | ID model yang dikirim ke endpoint |
| `PI_RAKIT_PROVIDER_MODEL_NAME` | sama dengan ID model | Nama tampilan model |
| `PI_RAKIT_PROVIDER_CONTEXT_WINDOW` | `128000` | Context window berupa bilangan bulat positif |
| `PI_RAKIT_PROVIDER_MAX_TOKENS` | `8192` | Batas output berupa bilangan bulat positif |
| `PI_RAKIT_PROVIDER_REASONING` | `false` | `true`/`false` atau `1`/`0` |
| `PI_RAKIT_PROVIDER_IMAGES` | `false` | Aktifkan input gambar dengan `true` atau `1` |

Extension mendaftarkan API key sebagai `$PI_RAKIT_PROVIDER_API_KEY`; nilai rahasia tidak disalin ke konfigurasi provider. Jangan commit API key, file `.env`, atau output shell yang memuat credential.

## Contoh Konfigurasi

### Model lokal yang berbeda

```bash
export PI_RAKIT_PROVIDER_MODEL="qwen2.5-coder:7b"
export PI_RAKIT_PROVIDER_MODEL_NAME="Qwen 2.5 Coder 7B"
export PI_RAKIT_PROVIDER_CONTEXT_WINDOW="32768"
export PI_RAKIT_PROVIDER_MAX_TOKENS="4096"
pi
```

### Endpoint dengan reasoning dan gambar

Aktifkan hanya jika model dan endpoint benar-benar mendukung kemampuan tersebut:

```bash
export PI_RAKIT_PROVIDER_BASE_URL="https://api.example.com/v1"
export PI_RAKIT_PROVIDER_API_KEY="your-secret-key"
export PI_RAKIT_PROVIDER_MODEL="multimodal-model"
export PI_RAKIT_PROVIDER_REASONING="true"
export PI_RAKIT_PROVIDER_IMAGES="true"
pi
```

Nilai biaya model didaftarkan sebagai nol karena extension tidak mengetahui tarif gateway. Periksa tarif layanan secara terpisah.

## Troubleshooting

### Model tidak muncul

Pastikan package telah terpasang, restart atau reload Pi, lalu buka `/model`. Jika `PI_RAKIT_PROVIDER_ID` atau `PI_RAKIT_PROVIDER_MODEL` diubah, pilihan model mengikuti nilai baru tersebut.

### Koneksi ditolak

Periksa apakah server berjalan dan base URL menyertakan path OpenAI-compatible yang benar, biasanya `/v1`:

```bash
curl http://localhost:11434/v1/models
```

### Unauthorized atau credential hilang

Pastikan `PI_RAKIT_PROVIDER_API_KEY` tersedia di environment shell yang memulai Pi. Jangan menaruh key langsung di source extension.

### Konfigurasi gagal dimuat

`CONTEXT_WINDOW` dan `MAX_TOKENS` harus berupa bilangan bulat positif. Nilai boolean hanya menerima `true`, `false`, `1`, atau `0`. Pesan error menyebutkan variable yang tidak valid.

### Endpoint tidak kompatibel

Extension ini secara tetap menggunakan adapter `openai-completions`. Endpoint yang hanya mendukung protokol lain memerlukan extension provider yang berbeda atau perubahan implementasi.

## Batasan

Satu instalasi extension mendaftarkan satu provider dengan satu model. Untuk beberapa model atau provider sekaligus, diperlukan package tambahan atau pengembangan konfigurasi multi-model.
