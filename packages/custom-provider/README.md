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

Then start or reload Pi and select `rakit-openai/your-model-id` with `/model`. Configuration is read when the extension loads, so restart or reload Pi after changing environment variables.

Run `/provider` to choose an available provider and model, or select **Custom provider** to enter:

- API URL (must use `http` or `https`)
- API key
- Context window
- Max tokens

After the URL and API key are entered, the command queries the OpenAI-compatible `GET <baseUrl>/models` endpoint with a five-second timeout and displays the returned model IDs as a selection list. Choose **Enter model manually** when needed. If discovery fails or returns no models, the command automatically falls back to Model ID and name inputs.

The custom provider is selected immediately for the current Pi session and saved in `~/.pi/agent/settings.json`. Choose **Manage custom providers** to add, edit, or delete providers and their models; adding a model also performs automatic discovery. The API key is entered through Pi's input dialog and is not displayed by the command.

For the default local setup, ensure Ollama is running and the model is available:

```bash
ollama pull llama3.2
ollama serve
```

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

Do not commit API keys. The extension passes `$PI_RAKIT_PROVIDER_API_KEY` to Pi, so Pi resolves the environment variable only when it needs the credential. The provider always uses the `openai-completions` API adapter and registers one model. Enable reasoning or images only when the endpoint and model support them.

## Troubleshooting

- **Model missing:** restart or reload Pi, run `/model`, and look for `<provider-id>/<model-id>`.
- **Discovery unavailable:** verify that `GET <baseUrl>/models` is supported, or use **Enter model manually**.
- **Connection refused:** start the local server and verify that the base URL includes its OpenAI-compatible path, commonly `/v1`.
- **Unauthorized:** export `PI_RAKIT_PROVIDER_API_KEY` in the shell that starts Pi.
- **Configuration error:** context and token limits must be positive integers; booleans accept only `true`, `false`, `1`, or `0`.

See the [complete Custom Provider guide](https://github.com/4nndmw/pi-rakit/blob/main/docs/rakit/Custom%20Provider.md).

## Local development

```bash
pi -e ./packages/custom-provider/extensions/index.js
```
