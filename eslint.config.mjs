// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // `any` 사용 시 경고. 타입 안전성이 필요한 경우 `unknown` + 타입 가드로 대체하거나
      // 불가피한 경우 eslint-disable 주석과 이유를 명시할 것.
      "@typescript-eslint/no-explicit-any": "warn",

      // NestJS 데코레이터(@Injectable, @Controller 등)에서 오탐이 많으므로 비활성화.
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",

      // 빌드를 깨지 않으면서 점진적으로 타입 안전성을 강화하기 위해 경고 수준으로 유지.
      // 향후 코드베이스 안정화 시 "error"로 격상할 것.
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",

      // _ 접두사 변수/인자는 의도적으로 미사용임을 나타낸다.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
);
