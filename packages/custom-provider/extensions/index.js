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

export async function discoverAvailableModels(
  baseUrl,
  apiKey,
  { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Model discovery is unavailable in this runtime");
  }

  const endpoint = new URL(readCustomProviderUrl(baseUrl));
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/models`;
  endpoint.search = "";
  endpoint.hash = "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${readCustomProviderInput(apiKey, "API key")}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Model discovery failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.data) ? payload.data : [];
    const seen = new Set();
    return models.flatMap((model) => {
      const id = typeof model?.id === "string" ? model.id.trim() : "";
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const discoveredName = model.name || model.display_name;
      const name =
        typeof discoveredName === "string" && discoveredName.trim()
          ? discoveredName.trim()
          : id;
      return [{ id, name }];
    });
  } finally {
    clearTimeout(timeout);
  }
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
        reasoning: model.reasoning === true,
        input: readInputType(model.input),
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

function providerLabel(providerId, modelCount) {
  const labels = {
    anthropic: "Claude (Anthropic)",
    openai: "ChatGPT (OpenAI)",
    google: "Gemini (Google)",
    mistral: "Mistral",
    groq: "Groq",
    xai: "Grok (xAI)",
  };
  const name = labels[providerId] || providerId;
  return modelCount != null ? `${name} — ${modelCount} model${modelCount !== 1 ? "s" : ""}` : name;
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

function fmtNum(n) {
  if (!n) return "?";
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

function modelDetail(model) {
  const ctx_ = fmtNum(model.contextWindow);
  const max = fmtNum(model.maxTokens);
  const r = model.reasoning ? " | 🧠" : "";
  return `${model.id} — ctx:${ctx_} max:${max}${r}`;
}

async function selectAvailableProvider(pi, ctx, providerId) {
  const models = ctx.modelRegistry
    .getAvailable()
    .filter((model) => model.provider === providerId);
  const modelId = await ctx.ui.select(
    `Select a model from ${providerId}`,
    models.map((model) => modelDetail(model)),
  );
  if (!modelId) return;

  // extract real id from label (format: "id — ctx:Xk max:Yk")
  const realId = modelId.includes(" — ") ? modelId.split(" — ")[0] : modelId;
  const model = ctx.modelRegistry.find(providerId, realId);
  if (!model) {
    ctx.ui.notify(`Model ${providerId}/${realId} was not found.`, "error");
    return;
  }

  const selected = await pi.setModel(model);
  ctx.ui.notify(
    selected
      ? `Using ${providerId}/${realId}.`
      : `Could not authenticate with ${providerId}/${realId}.`,
    selected ? "info" : "error",
  );
}

// Ask for a text value. The current value is shown as a placeholder so the
// user can press Enter to keep it, or Esc to cancel. Returns { ok: false }
// only when the dialog is cancelled.
async function askField(ctx, label, current) {
  const shown = current === undefined || current === null ? "" : String(current);
  const result = await ctx.ui.input(label, shown);
  if (result === undefined) return { ok: false };
  const value = result.trim();
  return { ok: true, value: value === "" ? current : value };
}

function readInputType(input) {
  return Array.isArray(input) && input.includes("image")
    ? ["text", "image"]
    : ["text"];
}

async function promptInputType(ctx, current) {
  const currentType = readInputType(current).includes("image")
    ? "text + image"
    : "text";
  const selected = await ctx.ui.select(`Input type (current: ${currentType})`, [
    "text",
    "text + image",
  ]);
  if (!selected) return undefined;
  return selected === "text + image" ? ["text", "image"] : ["text"];
}

async function promptModel(ctx, model = {}, fixedIdentity) {
  let id = fixedIdentity?.id;
  if (!id) {
    const field = await askField(ctx, "Model ID", model.id || "model-id");
    if (!field.ok || !field.value) return null;
    id = field.value;
  }
  let name = fixedIdentity?.name;
  if (!name) {
    const field = await askField(ctx, "Model name", model.name || id);
    if (!field.ok || !field.value) return null;
    name = field.value;
  }
  const contextField = await askField(
    ctx,
    "Context window",
    model.contextWindow || DEFAULTS.contextWindow,
  );
  if (!contextField.ok || !contextField.value) return null;
  const maxTokensField = await askField(
    ctx,
    "Max tokens",
    model.maxTokens || DEFAULTS.maxTokens,
  );
  if (!maxTokensField.ok || !maxTokensField.value) return null;
  const input = await promptInputType(ctx, model.input);
  if (!input) return null;
  return {
    id,
    name,
    contextWindow: contextField.value,
    maxTokens: maxTokensField.value,
    input,
  };
}

async function discoverAndPromptModel(ctx, baseUrl, apiKey, current, options) {
  const manualOption = "Enter model manually";
  let discovered;
  try {
    discovered = await discoverAvailableModels(baseUrl, apiKey, options);
  } catch (error) {
    ctx.ui.notify(
      `Could not detect models: ${error.message}. Enter the model manually.`,
      "warning",
    );
    return promptModel(ctx, current);
  }

  if (discovered.length === 0) {
    ctx.ui.notify(
      "No models were returned by the API. Enter the model manually.",
      "warning",
    );
    return promptModel(ctx, current);
  }

  const selectedId = await ctx.ui.select("Select a detected model", [
    ...discovered.map((model) => model.id),
    manualOption,
  ]);
  if (!selectedId) return null;
  if (selectedId === manualOption) return promptModel(ctx, current);

  const identity = discovered.find((model) => model.id === selectedId);
  const existing = current?.id === selectedId ? current : {};
  return promptModel(ctx, existing, identity);
}

async function promptProvider(ctx, current = {}, options = {}) {
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
  const model = await discoverAndPromptModel(
    ctx,
    baseUrl,
    apiKey,
    current.models?.[0],
    options,
  );
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

// Edit only the fields the user picks. Each prompt shows the current value as a
// placeholder, so pressing Enter keeps it without retyping.
async function editProvider(ctx, provider) {
  while (true) {
    const field = await ctx.ui.select(`Edit provider "${provider.name}"`, [
      `Provider ID: ${provider.providerId}`,
      `Name: ${provider.name}`,
      `API URL: ${provider.baseUrl}`,
      "API key",
      "Back",
    ]);
    if (!field || field === "Back") return provider;

    if (field.startsWith("Provider ID")) {
      const result = await askField(ctx, "Provider ID", provider.providerId);
      if (!result.ok) return provider;
      if (result.value) provider.providerId = result.value;
    } else if (field.startsWith("Name")) {
      const result = await askField(ctx, "Provider name", provider.name);
      if (!result.ok) return provider;
      if (result.value) provider.name = result.value;
    } else if (field.startsWith("API URL")) {
      const result = await askField(ctx, "API URL", provider.baseUrl);
      if (!result.ok) return provider;
      if (result.value) provider.baseUrl = result.value;
    } else if (field === "API key") {
      const result = await askField(ctx, "API key", provider.apiKey);
      if (!result.ok) return provider;
      if (result.value) provider.apiKey = result.value;
    }
  }
}

// Field-by-field model editing. `allowReasoning` is on for Pi-native
// models.json entries; `existingIds` guards against duplicate IDs.
async function editModel(ctx, model, { allowReasoning = false, existingIds } = {}) {
  while (true) {
    const inputType = readInputType(model.input).includes("image")
      ? "text + image"
      : "text";
    const reasoning = model.reasoning === true;
    const field = await ctx.ui.select(`Edit model "${model.id}"`, [
      `Model ID: ${model.id}`,
      `Name: ${model.name}`,
      `Context window: ${model.contextWindow}`,
      `Max tokens: ${model.maxTokens}`,
      ...(allowReasoning ? [`Reasoning: ${reasoning}`] : []),
      `Input type: ${inputType}`,
      "Back",
    ]);
    if (!field || field === "Back") return model;

    if (field.startsWith("Model ID")) {
      const result = await askField(ctx, "Model ID", model.id);
      if (!result.ok) return model;
      if (result.value && result.value !== model.id) {
        if (existingIds && existingIds.has(result.value)) {
          ctx.ui.notify(`Model "${result.value}" already exists.`, "error");
        } else {
          model.id = result.value;
        }
      }
    } else if (field.startsWith("Name")) {
      const result = await askField(ctx, "Model name", model.name);
      if (!result.ok) return model;
      if (result.value) model.name = result.value;
    } else if (field.startsWith("Context window")) {
      const result = await askField(ctx, "Context window", model.contextWindow);
      if (!result.ok) return model;
      const parsed = Number(result.value);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        ctx.ui.notify("Context window must be a positive integer.", "error");
      } else {
        model.contextWindow = parsed;
      }
    } else if (field.startsWith("Max tokens")) {
      const result = await askField(ctx, "Max tokens", model.maxTokens);
      if (!result.ok) return model;
      const parsed = Number(result.value);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        ctx.ui.notify("Max tokens must be a positive integer.", "error");
      } else {
        model.maxTokens = parsed;
      }
    } else if (field.startsWith("Reasoning")) {
      const selected = await ctx.ui.select(`Reasoning (current: ${reasoning})`, [
        "true",
        "false",
      ]);
      if (selected === "true") model.reasoning = true;
      else if (selected === "false") model.reasoning = false;
    } else if (field.startsWith("Input type")) {
      const next = await promptInputType(ctx, model.input);
      if (next) model.input = next;
    }
  }
}

async function selectCustomModel(pi, ctx, provider) {
  const providerId = provider.providerId || DEFAULTS.customProviderId;
  const modelId = await ctx.ui.select(
    `Select a model from ${provider.name}`,
    provider.models.map((model) => modelDetail(model)),
  );
  if (!modelId) return;
  const realId = modelId.includes(" — ") ? modelId.split(" — ")[0] : modelId;
  const model = ctx.modelRegistry.find(providerId, realId);
  if (!model) {
    ctx.ui.notify(`Model ${providerId}/${realId} was not found.`, "error");
    return;
  }
  const selected = await pi.setModel(model);
  ctx.ui.notify(
    selected
      ? `Using ${providerId}/${realId}.`
      : `Could not authenticate with ${providerId}/${realId}.`,
    selected ? "info" : "error",
  );
}

async function manageModels(pi, ctx, configs, provider, options) {
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
      const model = await discoverAndPromptModel(
        ctx,
        provider.baseUrl,
        provider.apiKey,
        undefined,
        options,
      );
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
        await editModel(ctx, provider.models[modelIndex], {
          existingIds: new Set(provider.models.map((model) => model.id)),
        });
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

async function manageProviders(pi, ctx, configs, options) {
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
      const provider = await promptProvider(ctx, {}, options);
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
        await editProvider(ctx, provider);
        const normalized = normalizeCustomProvider(provider);
        Object.assign(provider, normalized);
        pi.registerProvider(
          normalized.providerId || DEFAULTS.customProviderId,
          normalized,
        );
      } else if (action === "Manage models") {
        await manageModels(pi, ctx, configs, provider, options);
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

// ── models.json management ───────────────────────────────────────────

function modelsPath() {
  return path.join(homedir(), ".pi", "agent", "models.json");
}

function readModels() {
  if (!existsSync(modelsPath())) return { providers: {} };
  try {
    return JSON.parse(readFileSync(modelsPath(), "utf8"));
  } catch {
    return { providers: {} };
  }
}

function writeModels(data) {
  mkdirSync(path.dirname(modelsPath()), { recursive: true });
  writeFileSync(modelsPath(), `${JSON.stringify(data, null, 2)}\n`);
}

function modelsProviderLabel(pid, pdata) {
  const count = Array.isArray(pdata?.models) ? pdata.models.length : 0;
  return `${pid} (${count} model${count !== 1 ? "s" : ""})`;
}

async function manageModelsJSON(pi, ctx) {
  const data = readModels();
  const pids = Object.keys(data.providers);

  if (pids.length === 0) {
    ctx.ui.notify("No providers in models.json.", "info");
    return;
  }

  function modelsJSONProviderLabel(pid) {
    const pdata = data.providers[pid];
    const count = Array.isArray(pdata?.models) ? pdata.models.length : 0;
    const url = pdata?.baseUrl ? ` | ${pdata.baseUrl}` : "";
    return `${pid} — ${count} model${count !== 1 ? "s" : ""}${url}`;
  }

  while (true) {
    const selected = await ctx.ui.select(
      "Manage providers in models.json",
      [...pids.map((pid) => modelsJSONProviderLabel(pid)), "Back"],
    );
    if (!selected || selected === "Back") return;

    const pid = pids.find((id) => selected.startsWith(id));
    if (!pid) continue;
    const provider = data.providers[pid];
    if (!Array.isArray(provider.models)) provider.models = [];
    const models = provider.models;

    // Inner loop: manage models inside this provider
    while (true) {
      const modelOptions = [
        ...models.map((m) => modelDetail(m)),
        "+ Add new model",
        "Back",
      ];
      const action = await ctx.ui.select(
        `"${pid}" — ${models.length} model(s)`,
        modelOptions,
      );
      if (!action || action === "Back") break;

      if (action === "+ Add new model") {
        const mid = await ctx.ui.input("Model ID", "model-id");
        if (!mid) continue;
        const name = await ctx.ui.input("Model name", mid);
        if (!name) continue;
        const contextStr = await ctx.ui.input("Context window", "68000");
        if (!contextStr) continue;
        const maxTokensStr = await ctx.ui.input("Max tokens", "16384");
        if (!maxTokensStr) continue;
        const reasoningStr = await ctx.ui.input("Reasoning (true/false)", "false");
        if (!reasoningStr) continue;
        const inputType = await ctx.ui.select("Input type", ["text", "text + image"]);
        if (!inputType) continue;
        const contextWindow = Number(contextStr);
        const maxTokens = Number(maxTokensStr);
        const reasoning = reasoningStr === "true";
        const input = inputType === "text + image" ? ["text", "image"] : ["text"];
        if (!Number.isSafeInteger(contextWindow) || contextWindow <= 0) {
          ctx.ui.notify("Context window must be a positive integer.", "error");
          continue;
        }
        if (!Number.isSafeInteger(maxTokens) || maxTokens <= 0) {
          ctx.ui.notify("Max tokens must be a positive integer.", "error");
          continue;
        }
        const existing = models.some((m) => m.id === mid);
        if (existing) {
          ctx.ui.notify(`Model "${mid}" already exists in this provider.`, "error");
          continue;
        }
        models.push({
          id: mid,
          name,
          reasoning,
          input,
          contextWindow,
          maxTokens,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        });
        writeModels(data);
        ctx.ui.notify(`Added model "${mid}" to "${pid}". Reload Pi to apply.`, "info");
        continue;
      }

      // Existing model selected — extract real id from detail label
      const realModelId = action.includes(" — ") ? action.split(" — ")[0] : action;
      const modelIdx = models.findIndex((m) => m.id === realModelId);
      if (modelIdx === -1) continue;
      const modelAction = await ctx.ui.select(`Model: ${realModelId}`, ["Edit", "Delete", "Back"]);
      if (!modelAction || modelAction === "Back") continue;

      if (modelAction === "Delete") {
        const confirm = await ctx.ui.confirm(`Delete model "${realModelId}" from "${pid}"?`);
        if (confirm) {
          provider.models = models.filter((m) => m.id !== realModelId);
          if (provider.models.length === 0) {
            // ponytail: prompt to also delete empty provider, add when users complain
          }
          writeModels(data);
          ctx.ui.notify(`Deleted model "${realModelId}". Reload Pi to apply.`, "info");
        }
        continue;
      }

      if (modelAction === "Edit") {
        const cur = models[modelIdx];
        await editModel(ctx, cur, {
          allowReasoning: true,
          existingIds: new Set(models.map((m) => m.id)),
        });
        writeModels(data);
        ctx.ui.notify(`Updated model "${cur.id}". Reload Pi to apply.`, "info");
      }
    }
  }
}

// ── main extension ────────────────────────────────────────────────────

export default function customProvider(pi, options = {}) {
  const { providerId, config } = buildProviderRegistration();
  pi.registerProvider(providerId, config);
  const savedConfigs = loadCustomProviderConfigs();
  registerSavedProviders(pi, savedConfigs);
  pi.registerCommand("custom-provider", {
    description: "Manage Pi Rakit providers and models",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/custom-provider requires an interactive UI.", "error");
        return;
      }

      while (true) {
        const providers = getAvailableProviders(ctx);
        const savedProviderIds = new Set(
          savedConfigs.map(
            (provider) => provider.providerId || DEFAULTS.customProviderId,
          ),
        );
        const allModels = ctx.modelRegistry?.getAvailable?.() || [];
        const choices = [
          ...providers
            .filter((id) => !savedProviderIds.has(id))
            .map((id) => ({
              label: providerLabel(id, allModels.filter((m) => m.provider === id).length),
              id,
              custom: false,
            })),
          ...savedConfigs.map((provider) => {
            const n = provider.models?.length ?? 0;
            const url = provider.baseUrl ? ` | ${provider.baseUrl}` : "";
            return {
              label: `${provider.name} — ${n} model${n !== 1 ? "s" : ""}${url} (custom)`,
              id: provider.providerId,
              custom: true,
            };
          }),
        ];
        
        const addOption = "Add custom provider";
        const manageOption = "Manage custom providers";
        const modelsJsonOption = "Manage models.json";
        
        const selectedProvider = await ctx.ui.select("Select provider or manage", [
          ...choices.map((choice) => choice.label),
          addOption,
          manageOption,
          modelsJsonOption,
          "Exit",
        ]);
        
        if (!selectedProvider || selectedProvider === "Exit") return;
        
        if (selectedProvider === addOption) {
          const provider = await promptProvider(ctx, {}, options);
          if (!provider) continue;
          savedConfigs.push(provider);
          pi.registerProvider(provider.providerId, provider);
          saveCustomProviderConfigs(savedConfigs);
          await selectCustomModel(pi, ctx, provider);
          return;
        }
        if (selectedProvider === manageOption) {
          await manageProviders(pi, ctx, savedConfigs, options);
          continue; // loop back to main menu
        }
        if (selectedProvider === modelsJsonOption) {
          await manageModelsJSON(pi, ctx);
          continue; // loop back to main menu
        }
        
        const choice = choices.find((item) => item.label === selectedProvider);
        if (!choice) continue;
        if (choice.custom) {
          const provider = findCustomProvider(savedConfigs, choice.id);
          if (provider) await selectCustomModel(pi, ctx, provider);
          return;
        }
        await selectAvailableProvider(pi, ctx, choice.id);
        return;
      }
    },
  });
}
