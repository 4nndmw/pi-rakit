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
  return path.join(homedir(), ".pi", "agent", "settings.json");
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
  writeSettings(settings);
}

export function loadCustomProviderConfig() {
  const settings = readSettings();
  return settings.customProvider || null;
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
  baseUrl,
  apiKey,
  modelId,
  contextWindow,
  maxTokens,
}) {
  return {
    providerId: DEFAULTS.customProviderId,
    config: {
      name: "Rakit Custom Provider",
      baseUrl: readCustomProviderUrl(baseUrl),
      apiKey: readCustomProviderInput(apiKey, "API key"),
      api: "openai-completions",
      models: [
        {
          id: readCustomProviderInput(modelId, "Model"),
          name: readCustomProviderInput(modelId, "Model"),
          reasoning: false,
          input: ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: readPositiveInteger(
            contextWindow,
            DEFAULTS.contextWindow,
            "Context window",
          ),
          maxTokens: readPositiveInteger(
            maxTokens,
            DEFAULTS.maxTokens,
            "Max tokens",
          ),
        },
      ],
    },
  };
}

function getAvailableProviders(ctx) {
  const models = ctx.modelRegistry?.getAvailable?.() || [];
  return [...new Set(models.map((model) => model.provider))].filter(Boolean);
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

async function configureCustomProvider(pi, ctx) {
  const baseUrl = await ctx.ui.input(
    "Custom provider API URL",
    "https://api.example.com/v1",
  );
  if (!baseUrl) return;
  const apiKey = await ctx.ui.input("Custom provider API key", "API key");
  if (!apiKey) return;
  const modelId = await ctx.ui.input("Custom provider model", "model-id");
  if (!modelId) return;
  const contextWindow = await ctx.ui.input(
    "Context window",
    String(DEFAULTS.contextWindow),
  );
  if (!contextWindow) return;
  const maxTokens = await ctx.ui.input(
    "Max tokens",
    String(DEFAULTS.maxTokens),
  );
  if (!maxTokens) return;

  try {
    const registration = buildCustomProviderRegistration({
      baseUrl,
      apiKey,
      modelId,
      contextWindow,
      maxTokens,
    });
    pi.registerProvider(registration.providerId, registration.config);
    saveCustomProviderConfig(registration.config);
    const model = ctx.modelRegistry.find(
      registration.providerId,
      registration.config.models[0].id,
    );
    if (!model) {
      ctx.ui.notify(
        "The custom provider model could not be registered.",
        "error",
      );
      return;
    }
    const selected = await pi.setModel(model);
    ctx.ui.notify(
      selected
        ? `Using ${registration.providerId}/${registration.config.models[0].id}.`
        : "The custom provider was registered, but authentication failed.",
      selected ? "info" : "error",
    );
  } catch (error) {
    ctx.ui.notify(error.message, "error");
  }
}

export default function customProvider(pi) {
  const { providerId, config } = buildProviderRegistration();
  pi.registerProvider(providerId, config);
  const savedConfig = loadCustomProviderConfig();
  if (savedConfig) {
    pi.registerProvider(DEFAULTS.customProviderId, savedConfig);
  }
  pi.registerCommand("provider", {
    description: "Choose a provider or configure a custom provider",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/provider requires an interactive UI.", "error");
        return;
      }

      const providers = getAvailableProviders(ctx);
      const customOption = "Custom provider";
      const selectedProvider = await ctx.ui.select("Select provider", [
        ...providers,
        customOption,
      ]);
      if (!selectedProvider) return;
      if (selectedProvider === customOption) {
        await configureCustomProvider(pi, ctx);
        return;
      }
      await selectAvailableProvider(pi, ctx, selectedProvider);
    },
  });
}
