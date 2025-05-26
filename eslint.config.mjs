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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/unbound-method": "off",

      // class 혹은 function 의 arguments 에 접근할 때,
      // 충분히 사용할 때 주의하여 사용할 수 있으므로 `off` 하도록 한다.
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",

      // 제네릭을 리턴해야 하는 경우가 충분히 존재할 수 있으므로
      // 해당 옵션은 `off` 하도록 한다.
      "@typescript-eslint/no-unsafe-return": "off",

      // 데코레이터를 사용할때 그다지 도움이 되지 않는 옵션이므로
      // 해당 옵션은 `off` 하도록 한다.
      "@typescript-eslint/no-unsafe-call": "off",

      // _ 인 경우에는 사용하지 않는 변수인 것으로 간주하도록 한다.
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
