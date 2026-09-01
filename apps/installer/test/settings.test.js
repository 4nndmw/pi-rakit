import assert from "node:assert/strict";
import test from "node:test";
import { mergePackageSources } from "../src/settings.js";

test("merges package sources without duplicates and preserves settings", () => {
	const result = mergePackageSources({ theme: "dark", packages: ["npm:one"] }, [
		"npm:one",
		"npm:two",
	]);

	assert.deepEqual(result, { theme: "dark", packages: ["npm:one", "npm:two"] });
});
