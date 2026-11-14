import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "supabase/**",
    ],
  },
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Rendering raw HTML is not allowed (docs/VSHARES_SECURITY.md T7).",
        },
      ],
    },
  },
  {
    // Architecture boundary: only the platform layer and module repositories may
    // import the database or auth vendor SDKs, and modules are imported only
    // through their public index.ts.
    // docs/VSHARES_ARCHITECTURE.md section 9; decision D-027.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/platform/**", "src/modules/*/repository.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*"],
              message:
                "Import the vendor SDK only in src/platform or a module repository.ts. Use the platform interfaces instead.",
            },
            {
              group: ["@/modules/*/*"],
              message: "Import another module only through its index.ts (its public API).",
            },
          ],
        },
      ],
    },
  },
];

export default config;
