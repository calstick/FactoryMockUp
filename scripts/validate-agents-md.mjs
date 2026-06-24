#!/usr/bin/env node
// Validates that AGENTS.md stays consistent with the codebase:
//  1. The file exists and has meaningful content.
//  2. Every `npm run <script>` it documents actually exists in package.json.
//  3. Every file/dir path it references in fenced code or backticks exists.
//  4. Every relative Markdown link resolves to a real file.
// Exits non-zero (failing CI) when AGENTS.md drifts from reality.

import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentsPath = path.join(repoRoot, "AGENTS.md");

/** @type {string[]} */
const errors = [];
/** @param {string} msg */
const fail = (msg) => errors.push(msg);

/** @param {string} rel @returns {Promise<boolean>} */
async function exists(rel) {
  try {
    await access(path.join(repoRoot, rel), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const agents = await readFile(agentsPath, "utf8").catch(() => null);
if (agents === null) {
  fail("AGENTS.md not found at repository root.");
  report();
}

if (agents.trim().length < 100) {
  fail("AGENTS.md is too short to be meaningful (<100 chars).");
}

const pkgRaw = await readFile(path.join(repoRoot, "package.json"), "utf8");
const scripts = JSON.parse(pkgRaw).scripts ?? {};

// 1) Documented `npm run <script>` references must exist in package.json.
const scriptRefs = new Set();
for (const m of agents.matchAll(/npm run ([a-z][\w:-]*)/g)) {
  scriptRefs.add(m[1]);
}
for (const name of scriptRefs) {
  if (!(name in scripts)) {
    fail(`AGENTS.md references "npm run ${name}" but it is not in package.json scripts.`);
  }
}

// 2) Relative Markdown links [text](path) must resolve (skip URLs and anchors).
for (const m of agents.matchAll(/\]\(([^)]+)\)/g)) {
  const target = m[1].split("#")[0].trim();
  if (!target || /^(https?:|mailto:)/.test(target)) continue;
  if (!(await exists(target))) {
    fail(`AGENTS.md links to "${target}" which does not exist.`);
  }
}

// 3) Backtick-wrapped repo paths that look like real files/dirs must exist.
for (const m of agents.matchAll(/`([^`]+)`/g)) {
  const token = m[1].trim();
  // Only treat clear path-like tokens with a known source extension or dir form.
  const looksLikePath =
    /^[\w./-]+\.(js|mjs|json|html|yml|yaml)$/.test(token) ||
    /^(src|tests|runbooks|scripts|\.github)\/[\w./-]+$/.test(token);
  if (!looksLikePath) continue;
  if (!(await exists(token))) {
    fail(`AGENTS.md references path "${token}" which does not exist.`);
  }
}

report();

function report() {
  if (errors.length > 0) {
    console.error("AGENTS.md validation FAILED:\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log("AGENTS.md validation passed: scripts, links, and paths are consistent.");
}
