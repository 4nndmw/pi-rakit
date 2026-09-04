import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import customProvider, {
  buildCustomProviderRegistration,
  buildProviderRegistration,
  getSettingsPath,
  loadCustomProviderConfig,
  saveCustomProviderConfig,
} from "../extensions/index.js";

process.env.PI_RAKIT_SETTINGS_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "pi-rakit-custom-provider-")),
  "settings.json",
);

test("builds a safe local provider by default", () => {
  const registration = buildProviderRegistration({});

  assert.equal(registration.providerId, "rakit-openai");
  assert.equal(registration.config.baseUrl, "http://localhost:11434/v1");
  assert.equal(registration.config.apiKey, "$PI_RAKIT_PROVIDER_API_KEY");
  assert.equal(registration.config.api, "openai-completions");
  assert.deepEqual(registration.config.models[0], {
    id: "llama3.2",
    name: "llama3.2",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  });
});

test("maps environment variables to the provider registration", () => {
  const registration = buildProviderRegistration({
    PI_RAKIT_PROVIDER_ID: "company-ai",
    PI_RAKIT_PROVIDER_NAME: "Company AI",
    PI_RAKIT_PROVIDER_BASE_URL: "https://ai.example.com/v1",
    PI_RAKIT_PROVIDER_MODEL: "reasoning-model",
    PI_RAKIT_PROVIDER_MODEL_NAME: "Reasoning Model",
    PI_RAKIT_PROVIDER_CONTEXT_WINDOW: "200000",
    PI_RAKIT_PROVIDER_MAX_TOKENS: "16384",
    PI_RAKIT_PROVIDER_REASONING: "true",
    PI_RAKIT_PROVIDER_IMAGES: "1",
  });

  assert.equal(registration.providerId, "company-ai");
  assert.equal(registration.config.name, "Company AI");
  assert.equal(registration.config.baseUrl, "https://ai.example.com/v1");
  assert.deepEqual(registration.config.models[0].input, ["text", "image"]);
  assert.equal(registration.config.models[0].reasoning, true);
  assert.equal(registration.config.models[0].contextWindow, 200000);
  assert.equal(registration.config.models[0].maxTokens, 16384);
});

test("rejects invalid numeric and boolean configuration", () => {
  assert.throws(
    () =>
      buildProviderRegistration({
        PI_RAKIT_PROVIDER_CONTEXT_WINDOW: "many",
      }),
    /PI_RAKIT_PROVIDER_CONTEXT_WINDOW must be a positive integer/,
  );
  assert.throws(
    () =>
      buildProviderRegistration({
        PI_RAKIT_PROVIDER_REASONING: "yes",
      }),
    /PI_RAKIT_PROVIDER_REASONING must be true, false, 1, or 0/,
  );
});

test("builds a runtime custom provider registration", () => {
  const registration = buildCustomProviderRegistration({
    baseUrl: "https://api.example.com/v1",
    apiKey: "secret",
    modelId: "custom-model",
    contextWindow: "65536",
    maxTokens: "4096",
  });

  assert.equal(registration.providerId, "rakit-custom");
  assert.equal(registration.config.baseUrl, "https://api.example.com/v1");
  assert.equal(registration.config.apiKey, "secret");
  assert.deepEqual(registration.config.models[0], {
    id: "custom-model",
    name: "custom-model",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 65536,
    maxTokens: 4096,
  });
});

test("rejects an invalid custom provider URL", () => {
  assert.throws(
    () =>
      buildCustomProviderRegistration({
        baseUrl: "localhost:11434/v1",
        apiKey: "secret",
        modelId: "custom-model",
        contextWindow: "65536",
        maxTokens: "4096",
      }),
    /API URL must use http or https/,
  );
});

test("registers the provider with Pi", () => {
  rmSync(getSettingsPath(), { recursive: true, force: true });
  let providerCall;
  let commandCall;
  customProvider({
    registerProvider(providerId, config) {
      providerCall = { providerId, config };
    },
    registerCommand(command, config) {
      commandCall = { command, config };
    },
  });

  assert.equal(providerCall.providerId, "rakit-openai");
  assert.equal(providerCall.config.models[0].id, "llama3.2");
  assert.equal(commandCall.command, "provider");
  assert.equal(
    commandCall.config.description,
    "Choose and manage providers and models",
  );
});

test("/provider configures and selects a custom provider", async () => {
  rmSync(getSettingsPath(), { recursive: true, force: true });
  let commandConfig;
  let registeredProvider;
  let selectedModel;
  customProvider({
    registerProvider(providerId, config) {
      registeredProvider = { providerId, config };
    },
    registerCommand(_command, config) {
      commandConfig = config;
    },
    async setModel(model) {
      selectedModel = model;
      return true;
    },
  });

  const inputValues = [
    "rakit-custom",
    "Rakit Custom Provider",
    "https://api.example.com/v1",
    "secret",
    "custom-model",
    "Custom Model",
    "65536",
    "4096",
  ];
  const selectValues = ["Add custom provider", "custom-model"];
  const notifications = [];
  await commandConfig.handler("", {
    hasUI: true,
    ui: {
      async select() {
        return selectValues.shift();
      },
      async input() {
        return inputValues.shift();
      },
      notify(message, level) {
        notifications.push({ message, level });
      },
    },
    modelRegistry: {
      find(providerId, modelId) {
        return { provider: providerId, id: modelId };
      },
    },
  });

  assert.equal(registeredProvider.providerId, "rakit-custom");
  assert.equal(registeredProvider.config.apiKey, "secret");
  assert.equal(registeredProvider.config.models[0].contextWindow, 65536);
  assert.equal(registeredProvider.config.models[0].maxTokens, 4096);
  assert.deepEqual(selectedModel, {
    provider: "rakit-custom",
    id: "custom-model",
  });
  assert.deepEqual(notifications, [
    { message: "Using rakit-custom/custom-model.", level: "info" },
  ]);
});

test("loadCustomProviderConfig returns null when no settings file exists", () => {
  rmSync(getSettingsPath(), { recursive: true, force: true });
  assert.equal(loadCustomProviderConfig(), null);
});

test("saveCustomProviderConfig persists config and loadCustomProviderConfig reads it", () => {
  const testConfig = {
    name: "Rakit Custom Provider",
    baseUrl: "https://api.example.com/v1",
    apiKey: "secret-key",
    models: [
      {
        id: "custom-model",
        name: "custom-model",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  };

  saveCustomProviderConfig(testConfig);
  const loaded = loadCustomProviderConfig();
  assert.deepEqual(loaded, testConfig);
  rmSync(getSettingsPath(), { recursive: true, force: true });
});
