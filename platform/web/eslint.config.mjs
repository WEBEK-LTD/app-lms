import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 55 The site's [lang] segment matches every first path segment, so this
    // rule would flag each plain <a> to an internal path (downloads, full
    // reloads). Pages use next/link where client navigation matters.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    ".data/**",
    ".netlify/**",
    // 17 The app preview, built from mobile/ (mobile/tool/build_preview.sh).
    "public/preview-app/**",
  ]),
]);
