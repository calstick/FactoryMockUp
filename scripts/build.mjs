#!/usr/bin/env node
// Build step for the "Weather & What to Wear" static site.
//
// The app ships as plain ES modules, so the build is intentionally small: it
// assembles a deployable `dist/` tree and minifies the JavaScript with esbuild.
// Crucially it also *measures* the build — per-stage durations and the byte
// savings from minification are written to `dist/build-metrics.json` and, when
// running in GitHub Actions, appended to the job summary. That gives us a
// concrete, tracked signal for build performance over time rather than a build
// that merely happens to run.

import { rm, mkdir, readdir, readFile, writeFile, copyFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import * as esbuild from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(repoRoot, "src");
const distDir = path.join(repoRoot, "dist");
const distSrcDir = path.join(distDir, "src");

/**
 * Time an async stage, returning its result and elapsed milliseconds.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ result: T, ms: number }>}
 */
async function timed(fn) {
  const start = performance.now();
  const result = await fn();
  return { result, ms: +(performance.now() - start).toFixed(1) };
}

/** Remove and recreate the output tree so each build starts clean. */
async function cleanOutput() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distSrcDir, { recursive: true });
}

/** Copy the static HTML entry point verbatim. */
async function copyStatic() {
  await copyFile(path.join(repoRoot, "index.html"), path.join(distDir, "index.html"));
}

/**
 * Minify every `src/*.js` module into `dist/src/`, preserving relative imports
 * (bundle: false) so the page keeps loading individual modules.
 * @returns {Promise<{ bytesIn: number, bytesOut: number, files: number }>}
 */
async function minifySources() {
  const entries = (await readdir(srcDir)).filter((f) => f.endsWith(".js"));
  let bytesIn = 0;
  let bytesOut = 0;

  for (const file of entries) {
    const source = await readFile(path.join(srcDir, file), "utf8");
    const out = await esbuild.transform(source, {
      loader: "js",
      format: "esm",
      minify: true,
      legalComments: "none",
      // External source maps let error trackers (Sentry) map minified frames
      // back to the original source.
      sourcemap: true,
      sourcefile: file
    });
    const code = `${out.code}\n//# sourceMappingURL=${file}.map\n`;
    bytesIn += Buffer.byteLength(source);
    bytesOut += Buffer.byteLength(code);
    await writeFile(path.join(distSrcDir, file), code);
    await writeFile(path.join(distSrcDir, `${file}.map`), out.map);
  }

  return { bytesIn, bytesOut, files: entries.length };
}

/**
 * Persist build metrics and surface them in the CI job summary when available.
 * @param {Record<string, unknown>} metrics
 */
async function reportMetrics(metrics) {
  await writeFile(path.join(distDir, "build-metrics.json"), JSON.stringify(metrics, null, 2));

  const saved = /** @type {number} */ (metrics.bytesIn) - /** @type {number} */ (metrics.bytesOut);
  const pct = metrics.bytesIn
    ? ((saved / /** @type {number} */ (metrics.bytesIn)) * 100).toFixed(1)
    : "0";
  const lines = [
    `Build completed in ${metrics.totalMs} ms`,
    `  clean:   ${metrics.cleanMs} ms`,
    `  static:  ${metrics.staticMs} ms`,
    `  minify:  ${metrics.minifyMs} ms (${metrics.files} files)`,
    `  output:  ${metrics.bytesOut} B from ${metrics.bytesIn} B (-${pct}%)`
  ];
  console.log(lines.join("\n"));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [
      "### Build performance",
      "",
      "| Stage | Duration |",
      "| ----- | -------- |",
      `| Clean | ${metrics.cleanMs} ms |`,
      `| Copy static | ${metrics.staticMs} ms |`,
      `| Minify JS | ${metrics.minifyMs} ms |`,
      `| **Total** | **${metrics.totalMs} ms** |`,
      "",
      `JS payload: **${metrics.bytesOut} B** (minified from ${metrics.bytesIn} B, −${pct}%).`,
      ""
    ].join("\n");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

async function main() {
  const buildStart = performance.now();
  const clean = await timed(cleanOutput);
  const stat = await timed(copyStatic);
  const min = await timed(minifySources);

  await reportMetrics({
    timestamp: new Date().toISOString(),
    totalMs: +(performance.now() - buildStart).toFixed(1),
    cleanMs: clean.ms,
    staticMs: stat.ms,
    minifyMs: min.ms,
    files: min.result.files,
    bytesIn: min.result.bytesIn,
    bytesOut: min.result.bytesOut
  });
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
