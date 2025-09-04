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
      // Enforce PUBLIC API ONLY imports - STRICT FSD BOUNDARY ENFORCEMENT
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // Block all internal imports - force public API usage
            {
              group: ["@features/*/api/*", "@features/*/model/*", "@features/*/lib/*", "@features/*/ui/*"],
              message: "CRITICAL: Direct internal imports forbidden. Use @features/[slice]/index.ts public API only.",
            },
            {
              group: ["@entities/*/api/*", "@entities/*/model/*", "@entities/*/lib/*", "@entities/*/ui/*"],
              message: "CRITICAL: Direct internal imports forbidden. Use @entities/[slice]/index.ts public API only.",
            },
            {
              group: ["@widgets/*/api/*", "@widgets/*/model/*", "@widgets/*/lib/*", "@widgets/*/ui/*"],
              message: "CRITICAL: Direct internal imports forbidden. Use @widgets/[slice]/index.ts public API only.",
            },
            {
              group: ["@shared/*/lib/*", "@shared/*/api/*", "@shared/*/ui/*"],
              message: "CRITICAL: Direct internal imports forbidden. Use @shared/[segment]/index.ts public API only.",
            },
            // Block cross-slice imports
            {
              group: ["@features/*/*"],
              message: "CRITICAL: Cross-slice imports forbidden. Use public API exports only.",
            },
            {
              group: ["@entities/*/*"],
              message: "CRITICAL: Cross-slice imports forbidden. Use public API exports only.",
            },
            {
              group: ["@widgets/*/*"],
              message: "CRITICAL: Cross-slice imports forbidden. Use public API exports only.",
            },
            // Block TypeScript any usage patterns
            {
              group: ["**/types"],
              message: "Import specific types, avoid wildcard imports that may include 'any' types.",
            },
          ],
        },
      ],
      // Enforce TypeScript strict typing
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
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
  // Critical Priority Components Architecture Rules
  {
    files: ["features/conflict-detection/**/*", "features/realtime-collaboration/**/*", "features/permission-control/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/*", "@processes/*", "@widgets/*"],
              message: "Critical features cannot import from higher layers.",
            },
            {
              group: ["react-dom/server"],
              message: "Critical features should avoid server-side rendering dependencies.",
            },
          ],
        },
      ],
    },
  },
  // Client/Server Component Boundary Enforcement (Next.js 15.5)
  {
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-dom/server"],
              message: "Server-side imports should only be in Server Components or API routes. Consider moving to a Server Component or use dynamic imports.",
            },
          ],
        },
      ],
    },
  },
  // Server Component Rules
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx", "app/**/loading.tsx", "app/**/error.tsx", "app/**/not-found.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-dom/client"],
              message: "Client-side imports are not allowed in Server Components.",
            },
            {
              group: ["@/shared/lib/hooks/*"],
              message: "React hooks are not allowed in Server Components. Move to a Client Component.",
            },
          ],
        },
      ],
    },
  },
  // Client Component Rules (use client directive)
  {
    files: ["**/*.client.tsx", "**/use*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["fs", "path", "crypto", "os"],
              message: "Node.js built-in modules are not allowed in Client Components.",
            },
          ],
        },
      ],
    },
  },
  // VideoIntegration Widget Rules
  {
    files: ["widgets/VideoIntegration/**/*"],
    rules: {
      "no-restricted-imports": [
        "error", 
        {
          patterns: [
            {
              group: ["@app/*", "@processes/*"],
              message: "VideoIntegration widget cannot import from app or processes layers.",
            },
            {
              group: ["@widgets/*/ui/*"],
              message: "Direct UI imports from other widgets forbidden. Use public API.",
            },
          ],
        },
      ],
    },
  },
  // RBAC Entity Rules - Framework Independence
  {
    files: ["entities/rbac/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next/*"],
              message: "RBAC entities must be framework-independent. Move React logic to features layer.",
            },
            {
              group: ["@app/*", "@processes/*", "@widgets/*", "@features/*"],
              message: "RBAC entities cannot import from higher layers.",
            },
          ],
        },
      ],
    },
  },
  // Prevent circular dependencies in critical components
  {
    files: ["**/*{ConflictDetection,RealtimeCollaboration,RBAC,VideoIntegration}*"],
    rules: {
      "import/no-cycle": ["error", { maxDepth: 3 }],
    },
  },
  // Test files - relax strict type checking
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error
    },
  },
];

export default eslintConfig;