const DEFAULTS = Object.freeze({
  providerId: "rakit-openai",
  providerName: "Pi Rakit OpenAI Compatible",
  baseUrl: "http://localhost:11434/v1",
  modelId: "llama3.2",
  contextWindow: 128000,
  maxTokens: 8192,
});

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

export default function customProvider(pi) {
  const { providerId, config } = buildProviderRegistration();
  pi.registerProvider(providerId, config);
  pi.registerCommand("provider", {
    description: "Show the active custom provider configuration",
    handler: async (_args, ctx) => {
      const model = config.models[0];
      ctx.ui.notify(
        [
          `Provider: ${providerId}`,
          `Name: ${config.name}`,
          `Base URL: ${config.baseUrl}`,
          `Model: ${model.name} (${model.id})`,
        ].join("\n"),
        "info",
      );
    },
  });
}
