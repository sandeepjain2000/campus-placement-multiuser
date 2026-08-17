import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".netlify/**",
    "backups/**",
  ]),

  // Intentional mobile/desktop split naming (mb_* / dt_*) — PascalCase would break the convention.
  // These files are real React components; rules-of-hooks false-positives on the lowercase name.
  {
    files: [
      "**/mb_*.jsx",
      "**/mb_*.js",
      "**/dt_*.jsx",
      "**/dt_*.js",
      "**/MobileDrives.jsx",
    ],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },

  // React Compiler hygiene: flag for gradual cleanup, do not fail lint while patterns are migrated.
  // Downgrading avoids risky mass rewrites of working sync-from-props effects.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
