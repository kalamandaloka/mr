import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"

export default [
  { ignores: ["**/.next/**", "**/dist/**", "**/node_modules/**"] },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
]
