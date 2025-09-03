import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

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
    files: ["cypress/**/*.ts", "cypress/**/*.js"],
    rules: {
      // Cypress에서 네임스페이스 사용 허용 (타입 확장을 위한 권장 패턴)
      "@typescript-eslint/no-namespace": "off",
      // Cypress 테스트에서 표현식 사용 허용
      "@typescript-eslint/no-unused-expressions": "off",
      // 언더스코어 prefix 변수 허용 (의도적으로 사용하지 않음을 표시)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
      // @ts-expect-error 권장, @ts-ignore 금지 유지
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          "ts-expect-error": "allow-with-description"
        }
      ]
    }
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "processes", pattern: "src/processes/**" },
        { type: "pages", pattern: "src/pages/**" },
        { type: "widgets", pattern: "src/widgets/**" },
        { type: "features", pattern: "src/features/**" },
        { type: "entities", pattern: "src/entities/**" },
        { type: "shared", pattern: "src/shared/**" },
      ],
      "boundaries/include": ["src/**/*"],
    },
    rules: {
      // 프로덕션 코드에서 strict 타입 안전성 강제
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error", 
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
      "@typescript-eslint/ban-ts-comment": "error",
      
      // FSD 아키텍처 경계 강제
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // app 레이어는 모든 하위 레이어에 의존 가능
            { from: "app", allow: ["processes", "pages", "widgets", "features", "entities", "shared"] },
            // processes 레이어는 하위 레이어에만 의존 가능
            { from: "processes", allow: ["pages", "widgets", "features", "entities", "shared"] },
            // pages 레이어는 하위 레이어에만 의존 가능
            { from: "pages", allow: ["widgets", "features", "entities", "shared"] },
            // widgets 레이어는 하위 레이어에만 의존 가능
            { from: "widgets", allow: ["features", "entities", "shared"] },
            // features 레이어는 하위 레이어에만 의존 가능
            { from: "features", allow: ["entities", "shared"] },
            // entities 레이어는 shared에만 의존 가능
            { from: "entities", allow: ["shared"] },
            // shared 레이어는 외부 라이브러리에만 의존 가능
            { from: "shared", allow: [] },
          ],
        },
      ],
      
      // Public API 경유 강제 (internal imports 금지)
      "boundaries/no-private": [
        "error",
        {
          allowUncles: false,
        },
      ],
    }
  }
];

export default eslintConfig;
