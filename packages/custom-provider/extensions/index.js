import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULTS = Object.freeze({
  providerId: "rakit-openai",
  customProviderId: "rakit-custom",
  providerName: "Pi Rakit OpenAI Compatible",
  baseUrl: "http://localhost:11434/v1",
  modelId: "llama3.2",
  contextWindow: 128000,
  maxTokens: 8192,
});

export function getSettingsPath() {
  return (
    process.env.PI_RAKIT_SETTINGS_PATH ||
    path.join(homedir(), ".pi", "agent", "settings.json")
  );
}

function readSettings() {
  const settingsPath = getSettingsPath();
  if (!existsSync(settingsPath)) return {};
  try {
    return JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

export function saveCustomProviderConfig(config) {
  const settings = readSettings();
  settings.customProvider = config;
  settings.customProviders = [config];
  writeSettings(settings);
}

export function loadCustomProviderConfig() {
  const settings = readSettings();
  return settings.customProviders?.[0] || settings.customProvider || null;
}

export function loadCustomProviderConfigs() {
  const settings = readSettings();
  if (Array.isArray(settings.customProviders)) return settings.customProviders;
  return settings.customProvider ? [settings.customProvider] : [];
}

export function saveCustomProviderConfigs(configs) {
  const settings = readSettings();
  settings.customProviders = configs;
  settings.customProvider = configs[0] || null;
  writeSettings(settings);
}

function readCustomProviderInput(value, variableName) {
  const resolved = value?.trim();
  if (!resolved) throw new Error(`${variableName} cannot be empty.`);
  return resolved;
}

function readCustomProviderUrl(value) {
  const resolved = readCustomProviderInput(value, "API URL");
  let url;
  try {
    url = new URL(resolved);
  } catch {
    throw new Error("API URL must be a valid URL.");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("API URL must use http or https.");
  }
  return resolved;
}

function readPositiveInteger(value, fallback, variableName) {
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer.`);
  }
  return parsed;
}

function readBoolean(value, fallback, variableName) {
  if (value === undefined || value === "") return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error(`${variableName} must be true, false, 1, or 0.`);
}

function readRequired(value, fallback, variableName) {
  const resolved = value?.trim() || fallback;
  if (!resolved) throw new Error(`${variableName} cannot be empty.`);
  return resolved;
}

export function buildProviderRegistration(env = process.env) {
  const providerId = readRequired(
    env.PI_RAKIT_PROVIDER_ID,
    DEFAULTS.providerId,
    "PI_RAKIT_PROVIDER_ID",
  );
  const modelId = readRequired(
    env.PI_RAKIT_PROVIDER_MODEL,
    DEFAULTS.modelId,
    "PI_RAKIT_PROVIDER_MODEL",
  );

  return {
    providerId,
    config: {
      name: readRequired(
        env.PI_RAKIT_PROVIDER_NAME,
        DEFAULTS.providerName,
        "PI_RAKIT_PROVIDER_NAME",
      ),
      baseUrl: readRequired(
        env.PI_RAKIT_PROVIDER_BASE_URL,
        DEFAULTS.baseUrl,
        "PI_RAKIT_PROVIDER_BASE_URL",
      ),
      apiKey: "$PI_RAKIT_PROVIDER_API_KEY",
      api: "openai-completions",
      models: [
        {
          id: modelId,
          name: env.PI_RAKIT_PROVIDER_MODEL_NAME?.trim() || modelId,
          reasoning: readBoolean(
            env.PI_RAKIT_PROVIDER_REASONING,
            false,
            "PI_RAKIT_PROVIDER_REASONING",
          ),
          input: readBoolean(
            env.PI_RAKIT_PROVIDER_IMAGES,
            false,
            "PI_RAKIT_PROVIDER_IMAGES",
          )
            ? ["text", "image"]
            : ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: readPositiveInteger(
            env.PI_RAKIT_PROVIDER_CONTEXT_WINDOW,
            DEFAULTS.contextWindow,
            "PI_RAKIT_PROVIDER_CONTEXT_WINDOW",
          ),
          maxTokens: readPositiveInteger(
            env.PI_RAKIT_PROVIDER_MAX_TOKENS,
            DEFAULTS.maxTokens,
            "PI_RAKIT_PROVIDER_MAX_TOKENS",
          ),
        },
      ],
    },
  };
}

export function buildCustomProviderRegistration({
  providerId = DEFAULTS.customProviderId,
  providerName = "Rakit Custom Provider",
  baseUrl,
  apiKey,
  models,
  modelId,
  contextWindow = DEFAULTS.contextWindow,
  maxTokens = DEFAULTS.maxTokens,
}) {
  const resolvedModels = models || [{ modelId, contextWindow, maxTokens }];
  return {
    providerId: readCustomProviderInput(providerId, "Provider ID"),
    config: {
      name: readCustomProviderInput(providerName, "Provider name"),
      baseUrl: readCustomProviderUrl(baseUrl),
      apiKey: readCustomProviderInput(apiKey, "API key"),
      api: "openai-completions",
      models: resolvedModels.map((model) => ({
        id: readCustomProviderInput(model.id || model.modelId, "Model"),
        name: readCustomProviderInput(
          model.name || model.id || model.modelId,
          "Model name",
        ),
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: readPositiveInteger(
          model.contextWindow,
          DEFAULTS.contextWindow,
          "Context window",
        ),
        maxTokens: readPositiveInteger(
          model.maxTokens,
          DEFAULTS.maxTokens,
          "Max tokens",
        ),
      })),
    },
  };
}

function normalizeCustomProvider(provider) {
  const registration = buildCustomProviderRegistration({
    providerId: provider.providerId || DEFAULTS.customProviderId,
    providerName: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    models: provider.models,
  });
  return { ...registration.config, providerId: registration.providerId };
}

function getAvailableProviders(ctx) {
  const models = ctx.modelRegistry?.getAvailable?.() || [];
  return [...new Set(models.map((model) => model.provider))].filter(Boolean);
}

function providerLabel(providerId) {
  const labels = {
    anthropic: "Claude (Anthropic)",
    openai: "ChatGPT (OpenAI)",
    google: "Gemini (Google)",
    mistral: "Mistral",
    groq: "Groq",
    xai: "Grok (xAI)",
  };
  return labels[providerId] || providerId;
}

function findCustomProvider(configs, providerId) {
  return configs.find((config) => config.providerId === providerId);
}

function registerSavedProviders(pi, configs) {
  for (const provider of configs) {
    const normalized = normalizeCustomProvider(provider);
    Object.assign(provider, normalized);
    pi.registerProvider(normalized.providerId, normalized);
  }
}

async function selectAvailableProvider(pi, ctx, providerId) {
  const models = ctx.modelRegistry
    .getAvailable()
    .filter((model) => model.provider === providerId);
  const modelId = await ctx.ui.select(
    `Select a model from ${providerId}`,
    models.map((model) => model.id),
  );
  if (!modelId) return;

  const model = ctx.modelRegistry.find(providerId, modelId);
  if (!model) {
    ctx.ui.notify(`Model ${providerId}/${modelId} was not found.`, "error");
    return;
  }

  const selected = await pi.setModel(model);
  ctx.ui.notify(
    selected
      ? `Using ${providerId}/${modelId}.`
      : `Could not authenticate with ${providerId}/${modelId}.`,
    selected ? "info" : "error",
  );
}

async function promptModel(ctx, model = {}) {
  const id = await ctx.ui.input("Model ID", model.id || "model-id");
  if (!id) return null;
  const name = await ctx.ui.input("Model name", model.name || id);
  if (!name) return null;
  const contextWindow = await ctx.ui.input(
    "Context window",
    String(model.contextWindow || DEFAULTS.contextWindow),
  );
  if (!contextWindow) return null;
  const maxTokens = await ctx.ui.input(
    "Max tokens",
    String(model.maxTokens || DEFAULTS.maxTokens),
  );
  if (!maxTokens) return null;
  return { id, name, contextWindow, maxTokens };
}

async function promptProvider(ctx, current = {}) {
  const providerId = await ctx.ui.input(
    "Provider ID",
    current.providerId || "my-provider",
  );
  if (!providerId) return null;
  const providerName = await ctx.ui.input(
    "Provider name",
    current.name || providerLabel(providerId),
  );
  if (!providerName) return null;
  const baseUrl = await ctx.ui.input(
    "API URL",
    current.baseUrl || "https://api.example.com/v1",
  );
  if (!baseUrl) return null;
  const apiKey = await ctx.ui.input("API key", current.apiKey || "API key");
  if (!apiKey) return null;
  const model = await promptModel(ctx, current.models?.[0]);
  if (!model) return null;

  const registration = buildCustomProviderRegistration({
    providerId,
    providerName,
    baseUrl,
    apiKey,
    models: [model],
  });
  return { ...registration.config, providerId: registration.providerId };
}

async function selectCustomModel(pi, ctx, provider) {
  const providerId = provider.providerId || DEFAULTS.customProviderId;
  const modelId = await ctx.ui.select(
    `Select a model from ${provider.name}`,
    provider.models.map((model) => model.id),
  );
  if (!modelId) return;
  const model = ctx.modelRegistry.find(providerId, modelId);
  if (!model) {
    ctx.ui.notify(`Model ${providerId}/${modelId} was not found.`, "error");
    return;
  }
  const selected = await pi.setModel(model);
  ctx.ui.notify(
    selected
      ? `Using ${providerId}/${modelId}.`
      : `Could not authenticate with ${providerId}/${modelId}.`,
    selected ? "info" : "error",
  );
}

async function manageModels(pi, ctx, configs, provider) {
  while (true) {
    const addOption = "Add model";
    const options = [
      ...provider.models.map((model) => model.id),
      addOption,
      "Back",
    ];
    const selected = await ctx.ui.select(`Models in ${provider.name}`, options);
    if (!selected || selected === "Back") return;
    if (selected === addOption) {
      const model = await promptModel(ctx);
      if (!model) continue;
      provider.models.push(model);
    } else {
      const modelIndex = provider.models.findIndex(
        (model) => model.id === selected,
      );
      const action = await ctx.ui.select(`Manage model ${selected}`, [
        "Edit model",
        "Delete model",
        "Back",
      ]);
      if (action === "Edit model") {
        const model = await promptModel(ctx, provider.models[modelIndex]);
        if (model) provider.models[modelIndex] = model;
      } else if (action === "Delete model") {
        provider.models.splice(modelIndex, 1);
      }
    }
    if (provider.models.length === 0) {
      ctx.ui.notify("A provider must have at least one model.", "error");
      continue;
    }
    const normalized = normalizeCustomProvider(provider);
    Object.assign(provider, normalized);
    saveCustomProviderConfigs(configs);
    pi.registerProvider(normalized.providerId, normalized);
  }
}

async function manageProviders(pi, ctx, configs) {
  while (true) {
    const addOption = "Add provider";
    const options = [
      ...configs.map((provider) => provider.name),
      addOption,
      "Back",
    ];
    const selected = await ctx.ui.select("Manage custom providers", options);
    if (!selected || selected === "Back") return;
    if (selected === addOption) {
      const provider = await promptProvider(ctx);
      if (!provider) continue;
      configs.push(provider);
      pi.registerProvider(
        provider.providerId || DEFAULTS.customProviderId,
        provider,
      );
    } else {
      const providerIndex = configs.findIndex(
        (provider) => provider.name === selected,
      );
      const provider = configs[providerIndex];
      const action = await ctx.ui.select(`Manage ${provider.name}`, [
        "Edit provider",
        "Manage models",
        "Delete provider",
        "Back",
      ]);
      if (action === "Edit provider") {
        const updated = await promptProvider(ctx, provider);
        if (updated) {
          configs[providerIndex] = updated;
          pi.registerProvider(
            updated.providerId || DEFAULTS.customProviderId,
            updated,
          );
        }
      } else if (action === "Manage models") {
        await manageModels(pi, ctx, configs, provider);
      } else if (action === "Delete provider") {
        configs.splice(providerIndex, 1);
        pi.unregisterProvider?.(
          provider.providerId || DEFAULTS.customProviderId,
        );
      }
    }
    saveCustomProviderConfigs(configs);
  }
}

export default function customProvider(pi) {
  const { providerId, config } = buildProviderRegistration();
  pi.registerProvider(providerId, config);
  const savedConfigs = loadCustomProviderConfigs();
  registerSavedProviders(pi, savedConfigs);
  pi.registerCommand("provider", {
    description: "Choose and manage providers and models",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/provider requires an interactive UI.", "error");
        return;
      }

      const providers = getAvailableProviders(ctx);
      const savedProviderIds = new Set(
        savedConfigs.map(
          (provider) => provider.providerId || DEFAULTS.customProviderId,
        ),
      );
      const choices = [
        ...providers
          .filter((id) => !savedProviderIds.has(id))
          .map((id) => ({
            label: providerLabel(id),
            id,
            custom: false,
          })),
        ...savedConfigs.map((provider) => ({
          label: `${provider.name} (custom)`,
          id: provider.providerId,
          custom: true,
        })),
      ];
      const addOption = "Add custom provider";
      const manageOption = "Manage custom providers";
      const selectedProvider = await ctx.ui.select("Select provider", [
        ...choices.map((choice) => choice.label),
        addOption,
        manageOption,
      ]);
      if (!selectedProvider || selectedProvider === "Back") return;
      if (selectedProvider === addOption) {
        const provider = await promptProvider(ctx);
        if (!provider) return;
        savedConfigs.push(provider);
        pi.registerProvider(provider.providerId, provider);
        saveCustomProviderConfigs(savedConfigs);
        await selectCustomModel(pi, ctx, provider);
        return;
      }
      if (selectedProvider === manageOption) {
        await manageProviders(pi, ctx, savedConfigs);
        return;
      }
      const choice = choices.find((item) => item.label === selectedProvider);
      if (!choice) return;
      if (choice.custom) {
        const provider = findCustomProvider(savedConfigs, choice.id);
        if (provider) await selectCustomModel(pi, ctx, provider);
        return;
      }
      await selectAvailableProvider(pi, ctx, choice.id);
    },
  });
}
