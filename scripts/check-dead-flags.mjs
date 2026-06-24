#!/usr/bin/env node
// Detects "dead" feature flags: keys defined in the FLAGS registry that are no
// longer referenced anywhere the app consumes flags. Run via `npm run deadflags`.
// Keeps src/feature-flags.js honest as features graduate or are removed.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FLAGS, OVERRIDE_PREFIX } from "../src/feature-flags.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The registry file is excluded so a flag's own definition never counts as use.
const REGISTRY_FILE = "feature-flags.js";

/**
 * Find flags defined in the registry but never referenced in the given source.
 * @param {string[]} flagKeys Keys from the FLAGS registry.
 * @param {string} haystack Concatenated text of every flag-consuming file.
 * @returns {string[]} Sorted list of unreferenced (dead) flag keys.
 */
export function findDeadFlags(flagKeys, haystack) {
  return flagKeys.filter((key) => !haystack.includes(key)).sort();
}

/** @returns {Promise<string>} Concatenated text of all flag-consuming sources. */
async function readConsumerSources() {
  const srcDir = path.join(repoRoot, "src");
  const srcFiles = (await readdir(srcDir))
    .filter((name) => name.endsWith(".js") && name !== REGISTRY_FILE)
    .map((name) => path.join(srcDir, name));
  const files = [path.join(repoRoot, "index.html"), ...srcFiles];
  const texts = await Promise.all(files.map((file) => readFile(file, "utf8").catch(() => "")));
  return texts.join("\n");
}

async function main() {
  const haystack = await readConsumerSources();
  const dead = findDeadFlags(Object.keys(FLAGS), haystack);
  if (dead.length > 0) {
    console.error("Dead feature flags detected (defined but unused):");
    for (const key of dead) {
      console.error(`  - ${key} (override: ${OVERRIDE_PREFIX}${key}) - ${FLAGS[key].description}`);
    }
    console.error(`\n${dead.length} dead flag(s) found. Remove them or wire them up.`);
    process.exitCode = 1;
    return;
  }
  const count = Object.keys(FLAGS).length;
  console.log(`No dead feature flags: all ${count} registered flag(s) are referenced.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
