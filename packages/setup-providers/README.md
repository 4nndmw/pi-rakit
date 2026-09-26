# pi-rakit-setup-providers

Overlay wizard for configuring custom providers and models in Pi.

Run `/setup-custom-providers` inside Pi. Providers and models are read from and
written to `~/.pi/agent/models.json` (a `.bak` backup is kept on save).

## Features

- Floating overlay menus, inputs, confirmations, and multi-select
- Add, edit, and remove providers
- Choose from multiple API adapters: `openai-completions`, `openai-responses`,
  `anthropic-messages`, `google-generative-ai`, `mistral-conversations`,
  `bedrock-converse-stream`
- Masked API key input with keep/replace/clear options
- Auto-discover models from an OpenAI-compatible `GET <baseUrl>/models` endpoint
  and add several at once
- Test the discovery endpoint and test a chat completion
- Provider health summary
- Reload-safe: configured providers are registered with Pi when the wizard exits

## Install

```bash
pi install npm:pi-rakit-setup-providers
```

Or select **Setup Providers** in the Pi Rakit installer.
