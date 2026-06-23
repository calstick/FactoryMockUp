import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "coverage/**", ".husky/**"]
  },
  js.configs.recommended,
  {
    // Browser application code.
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser }
    },
    rules: {
      // Naming consistency: enforce camelCase identifiers (API response keys,
      // accessed as properties, are intentionally exempt).
      camelcase: ["error", { properties: "never" }],
      // Cyclomatic complexity: flag functions with too many independent paths.
      complexity: ["error", 15],
      // Large file detection: cap module and function size.
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      // Dead code: surface unused variables and arguments.
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Tech debt tracking: report lingering debt-marker comments (non-blocking).
      "no-warning-comments": [
        "warn",
        { terms: ["todo", "fixme", "hack", "xxx"], location: "anywhere" }
      ],
      eqeqeq: ["error", "smart"]
    }
  },
  {
    // Test files and Node-run config files.
    files: ["tests/**/*.js", "*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: {
      "no-warning-comments": [
        "warn",
        { terms: ["todo", "fixme", "hack", "xxx"], location: "anywhere" }
      ]
    }
  }
];
