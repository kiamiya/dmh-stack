import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // .env.local vit à la racine du monorepo, pas dans apps/crm — un seul
  // fichier d'environnement pour tout le projet, cohérent avec les scripts
  // et Edge Functions.
  envDir: path.resolve(here, "../.."),
  // Expose ces variables telles quelles (sans exiger le préfixe VITE_ par
  // défaut de Vite), pour rester cohérent avec les noms utilisés partout
  // ailleurs dans le repo (.env.example, packages/config).
  envPrefix: ["SUPABASE_", "BASE_DOMAIN", "GOOGLE_CALENDAR_CLIENT_ID", "MICROSOFT_CLIENT_ID", "MICROSOFT_TENANT_ID"],
});
