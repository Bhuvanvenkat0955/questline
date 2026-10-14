import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // .cjs files (e.g. electron-builder's afterPack hook) are CommonJS: require() is how they import.
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Desktop app build output (generated, not our source):
    "dist-electron/**",
    "desktop-build/**",
    "desktop-dist/**",
  ]),
]);

export default eslintConfig;
