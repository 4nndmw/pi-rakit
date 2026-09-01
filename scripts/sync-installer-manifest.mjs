#!/usr/bin/env node
import { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "manifest.json");
const outputPath = path.join(root, "apps", "installer", "manifest.json");

copyFileSync(sourcePath, outputPath);
console.log(`Synced ${path.relative(root, outputPath)}`);
