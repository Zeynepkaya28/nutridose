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
      "coverage/**",
    ],
  },
  {
    // Domain layer stays framework-free (also checked by src/domain/__tests__/boundary.test.ts).
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*"], message: "src/domain Next.js import edemez." },
            { group: ["react", "react-dom", "react/*"], message: "src/domain React import edemez." },
            { group: ["@supabase/*"], message: "src/domain Supabase import edemez; CatalogRepository kullanın." },
            { group: ["@/lib/*", "@/app/*", "@/infra/*", "@/ui/*"], message: "src/domain uygulama katmanlarına bağımlı olamaz." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
