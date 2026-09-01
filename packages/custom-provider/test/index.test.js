import assert from "node:assert/strict";
import test from "node:test";
import customProvider, {
	buildProviderRegistration,
} from "../extensions/index.js";

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

test("registers the provider with Pi", () => {
	let call;
	customProvider({
		registerProvider(providerId, config) {
			call = { providerId, config };
		},
	});

	assert.equal(call.providerId, "rakit-openai");
	assert.equal(call.config.models[0].id, "llama3.2");
});
