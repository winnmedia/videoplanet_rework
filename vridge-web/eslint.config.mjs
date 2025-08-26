import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // FSD Import Rules
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            {
              pattern: "@app/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@processes/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@widgets/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@features/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@entities/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@shared/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      // Prevent cross-imports between slices
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@features/*/*"],
              message: "Direct cross-imports between features are forbidden. Use public API exports.",
            },
            {
              group: ["@entities/*/*"],
              message: "Direct cross-imports between entities are forbidden. Use public API exports.",
            },
            {
              group: ["@widgets/*/*"],
              message: "Direct cross-imports between widgets are forbidden. Use public API exports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../processes/*", "../widgets/*", "../features/*", "../entities/*", "../shared/*"],
              message: "App layer should import from absolute paths using @layer/* aliases.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["processes/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/*"],
              message: "Processes cannot import from app layer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["widgets/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/*", "@processes/*"],
              message: "Widgets cannot import from app or processes layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["features/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/*", "@processes/*", "@widgets/*"],
              message: "Features cannot import from app, processes, or widgets layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["entities/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/*", "@processes/*", "@widgets/*", "@features/*"],
              message: "Entities cannot import from higher layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["shared/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/*", "@processes/*", "@widgets/*", "@features/*", "@entities/*"],
              message: "Shared layer cannot import from any other layer.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;