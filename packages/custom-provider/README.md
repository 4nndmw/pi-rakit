# @anandamw/custom-provider

A Pi extension for managing providers and models through a unified `/rakit` command. Supports OpenAI-compatible local servers (Ollama, llama.cpp, vLLM), hosted gateways, and Pi-native `models.json` providers.

## Install

```bash
pi install npm:@anandamw/custom-provider
```

Or select **Custom Provider** in the Pi Rakit installer.

## Command: `/rakit`

Type `/rakit` inside Pi to open the management menu:

```
Select provider or manage
> Claude (Anthropic) — 5 models
  ChatGPT (OpenAI) — 12 models
  My Local Server — 2 models | http://localhost:11434/v1 (custom)
  Add custom provider
  Manage custom providers
  Manage models.json
  Exit
```

### Selecting a provider

Pick any provider from the list to see its models with detail:

```
> ag-claude — ctx:68k max:16k
  gemini — ctx:128k max:8k | 🧠
```

Select a model to switch the active session to that provider/model.

### Add custom provider

Prompts for:
1. Provider ID
2. Provider name
3. API URL (`http`/`https` only)
4. API key
5. Model — auto-discovered from `GET <baseUrl>/models`, or enter manually

After saving, the provider is registered and the model is selected for the current session. Saved to `~/.pi/agent/settings.json`.

### Manage custom providers

Add, edit, or delete custom providers and their models. Each provider supports multiple models. Editing a model re-prompts all fields with current values as defaults.

### Manage models.json

Manage Pi-native providers defined in `~/.pi/agent/models.json`.

```
9routerclaude — 1 model | http://localhost:20128/v1
```

Inside a provider, select a model to **Edit** or **Delete** it, or choose **+ Add new model**.

When adding or editing a model, fields are:

| Field | Description |
| --- | --- |
| Model ID | Unique identifier |
| Model name | Display name |
| Context window | Positive integer (e.g. `68000`) |
| Max tokens | Positive integer (e.g. `16384`) |
| Reasoning | `true` or `false` |
| Input type | `text` or `text + image` |

Changes to `models.json` take effect after reloading Pi.

## Environment variables (default provider)

The extension also registers a default OpenAI-compatible provider via environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PI_RAKIT_PROVIDER_ID` | `rakit-openai` | Provider identifier |
| `PI_RAKIT_PROVIDER_NAME` | `Pi Rakit OpenAI Compatible` | Display name |
| `PI_RAKIT_PROVIDER_BASE_URL` | `http://localhost:11434/v1` | OpenAI-compatible endpoint |
| `PI_RAKIT_PROVIDER_API_KEY` | unset | API key (resolved at request time) |
| `PI_RAKIT_PROVIDER_MODEL` | `llama3.2` | Model identifier |
| `PI_RAKIT_PROVIDER_MODEL_NAME` | model identifier | Model display name |
| `PI_RAKIT_PROVIDER_CONTEXT_WINDOW` | `128000` | Token context limit |
| `PI_RAKIT_PROVIDER_MAX_TOKENS` | `8192` | Max output tokens |
| `PI_RAKIT_PROVIDER_REASONING` | `false` | `true`/`false` or `1`/`0` |
| `PI_RAKIT_PROVIDER_IMAGES` | `false` | Enable image input support |

```bash
export PI_RAKIT_PROVIDER_BASE_URL="https://api.example.com/v1"
export PI_RAKIT_PROVIDER_API_KEY="your-secret-key"
export PI_RAKIT_PROVIDER_MODEL="your-model-id"
pi
```

Do not commit API keys. The extension passes `$PI_RAKIT_PROVIDER_API_KEY` to Pi so Pi resolves the variable only when needed.

For the default local setup, ensure Ollama is running:

```bash
ollama pull llama3.2
ollama serve
```

## Troubleshooting

- **Model missing:** restart Pi, run `/rakit`, and check the provider's model list.
- **Discovery unavailable:** verify `GET <baseUrl>/models` is supported, or use **Enter model manually**.
- **Connection refused:** start the local server and confirm the base URL includes `/v1`.
- **Unauthorized:** export `PI_RAKIT_PROVIDER_API_KEY` in the shell that starts Pi.
- **Validation error:** context window and max tokens must be positive integers; input type must be selected from the list.

## Local development

```bash
pi -e ./packages/custom-provider/extensions/index.js
```
