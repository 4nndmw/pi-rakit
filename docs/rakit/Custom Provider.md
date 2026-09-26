# Custom Provider

Pi Rakit Custom Provider registers a single OpenAI-compatible provider and model in Pi. The extension works with local servers such as Ollama, llama.cpp, and vLLM, or with a hosted gateway that exposes an OpenAI-compatible endpoint.

## Installation

Select **Custom Provider** when running the installer:

```bash
npx pi-rakit@latest
```

Or install it directly:

```bash
pi install npm:pi-rakit-custom-provider
```

## Default Usage with Ollama

The default configuration points to:

- Provider ID: `rakit-openai`
- Base URL: `http://localhost:11434/v1`
- Model: `llama3.2`
- API: `openai-completions`

Make sure Ollama is running and the model is available:

```bash
ollama pull llama3.2
ollama serve
```

Start or reload Pi, run `/model`, then select:

```text
rakit-openai/llama3.2
```

## Hosted Gateway

Set the configuration before starting Pi:

```bash
export PI_RAKIT_PROVIDER_BASE_URL="https://api.example.com/v1"
export PI_RAKIT_PROVIDER_API_KEY="your-secret-key"
export PI_RAKIT_PROVIDER_MODEL="your-model-id"
pi
```

Then select `rakit-openai/your-model-id` through `/model`.

Use `/custom-provider` to choose an available provider and model. Select **Custom provider** to fill in:

- API URL with the `http` or `https` protocol
- API key
- Context window
- Max tokens

After the URL and API key are provided, the command calls the OpenAI-compatible `GET <baseUrl>/models` endpoint with a five-second timeout and lists the discovered model IDs as options. Select **Enter model manually** when needed. If discovery fails or returns no models, the command falls back to manual model ID and name input.

The custom provider is registered and selected immediately for the current Pi session. The configuration is saved to `~/.pi/agent/settings.json`, so it persists after Pi restarts. The API key is entered through Pi's input dialog and is not displayed by the command.

To manage the configuration, select **Manage custom providers** in `/custom-provider`. It provides CRUD operations for providers and models: add, edit, and delete providers, as well as add, edit, and delete models. Adding a model also runs automatic discovery. Built-in providers such as ChatGPT, Claude, Gemini, and others only appear when they are available in the Pi configuration.

The configuration is read when the extension loads. After changing environment variables, restart or reload Pi.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PI_RAKIT_PROVIDER_ID` | `rakit-openai` | Provider ID used in the model selection |
| `PI_RAKIT_PROVIDER_NAME` | `Pi Rakit OpenAI Compatible` | Provider display name |
| `PI_RAKIT_PROVIDER_BASE_URL` | `http://localhost:11434/v1` | Base URL of the OpenAI-compatible endpoint |
| `PI_RAKIT_PROVIDER_API_KEY` | unset | Credential resolved by Pi when the request is made |
| `PI_RAKIT_PROVIDER_MODEL` | `llama3.2` | Model ID sent to the endpoint |
| `PI_RAKIT_PROVIDER_MODEL_NAME` | same as the model ID | Model display name |
| `PI_RAKIT_PROVIDER_CONTEXT_WINDOW` | `128000` | Context window as a positive integer |
| `PI_RAKIT_PROVIDER_MAX_TOKENS` | `8192` | Output limit as a positive integer |
| `PI_RAKIT_PROVIDER_REASONING` | `false` | `true`/`false` or `1`/`0` |
| `PI_RAKIT_PROVIDER_IMAGES` | `false` | Enable image input with `true` or `1` |

The extension registers the API key as `$PI_RAKIT_PROVIDER_API_KEY`; the secret value is not copied into the provider configuration. Do not commit API keys, `.env` files, or shell output that contains credentials.

## Configuration Examples

### A different local model

```bash
export PI_RAKIT_PROVIDER_MODEL="qwen2.5-coder:7b"
export PI_RAKIT_PROVIDER_MODEL_NAME="Qwen 2.5 Coder 7B"
export PI_RAKIT_PROVIDER_CONTEXT_WINDOW="32768"
export PI_RAKIT_PROVIDER_MAX_TOKENS="4096"
pi
```

### An endpoint with reasoning and images

Enable these only when the model and the endpoint actually support them:

```bash
export PI_RAKIT_PROVIDER_BASE_URL="https://api.example.com/v1"
export PI_RAKIT_PROVIDER_API_KEY="your-secret-key"
export PI_RAKIT_PROVIDER_MODEL="multimodal-model"
export PI_RAKIT_PROVIDER_REASONING="true"
export PI_RAKIT_PROVIDER_IMAGES="true"
pi
```

Model cost values are registered as zero because the extension does not know the gateway rates. Check the service rates separately.

## Troubleshooting

### The model does not appear

Make sure the package is installed, restart or reload Pi, then open `/model`. If `PI_RAKIT_PROVIDER_ID` or `PI_RAKIT_PROVIDER_MODEL` was changed, the model selection follows the new values.

If auto-detection does not show any model, make sure the `GET <baseUrl>/models` endpoint is available and that the API key is allowed to list models. Use **Enter model manually** for endpoints that do not expose a model list.

### Connection refused

Check that the server is running and that the base URL includes the correct OpenAI-compatible path, usually `/v1`:

```bash
curl http://localhost:11434/v1/models
```

### Unauthorized or missing credentials

Make sure `PI_RAKIT_PROVIDER_API_KEY` is available in the shell environment that starts Pi. Do not put the key directly in the extension source.

### Configuration failed to load

`CONTEXT_WINDOW` and `MAX_TOKENS` must be positive integers. Boolean values only accept `true`, `false`, `1`, or `0`. Error messages name the invalid variable.

### Incompatible endpoint

The extension always uses the `openai-completions` adapter. Endpoints that only support other protocols require a different provider extension or an implementation change.

## Limitations

Custom providers use the `openai-completions` adapter, so the URL must be compatible with OpenAI Chat Completions. The API key is stored in Pi settings to support reuse after a restart.
