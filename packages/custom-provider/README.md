# pi-rakit-custom-provider

A Pi extension that registers one configurable OpenAI-compatible model provider. It works with local servers such as Ollama, llama.cpp, and vLLM, as well as hosted OpenAI-compatible gateways.

## Install

```bash
pi install npm:pi-rakit-custom-provider
```

Or select **Custom Provider** in the Pi Rakit installer.

## Configure

The defaults target an Ollama-compatible local endpoint:

- Provider: `rakit-openai`
- Base URL: `http://localhost:11434/v1`
- Model: `llama3.2`
- API: `openai-completions`

Override them before starting Pi:

```bash
export PI_RAKIT_PROVIDER_BASE_URL="https://api.example.com/v1"
export PI_RAKIT_PROVIDER_API_KEY="your-secret-key"
export PI_RAKIT_PROVIDER_MODEL="your-model-id"
pi
```

Then select `rakit-openai/your-model-id` with `/model`.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PI_RAKIT_PROVIDER_ID` | `rakit-openai` | Provider identifier shown by Pi |
| `PI_RAKIT_PROVIDER_NAME` | `Pi Rakit OpenAI Compatible` | Display name |
| `PI_RAKIT_PROVIDER_BASE_URL` | `http://localhost:11434/v1` | OpenAI-compatible API endpoint |
| `PI_RAKIT_PROVIDER_API_KEY` | unset | API key resolved by Pi at request time |
| `PI_RAKIT_PROVIDER_MODEL` | `llama3.2` | Model identifier |
| `PI_RAKIT_PROVIDER_MODEL_NAME` | model identifier | Model display name |
| `PI_RAKIT_PROVIDER_CONTEXT_WINDOW` | `128000` | Positive integer token limit |
| `PI_RAKIT_PROVIDER_MAX_TOKENS` | `8192` | Positive integer output limit |
| `PI_RAKIT_PROVIDER_REASONING` | `false` | `true`/`false` or `1`/`0` |
| `PI_RAKIT_PROVIDER_IMAGES` | `false` | Enable image input support |

Do not commit API keys. The extension passes `$PI_RAKIT_PROVIDER_API_KEY` to Pi, so Pi resolves the environment variable only when it needs the credential.

## Local development

```bash
pi -e ./packages/custom-provider/extensions/index.js
```
