/**
 * Variables d'environnement exposées au navigateur par Vite (`envPrefix`,
 * voir vite.config.ts). Liste EXACTE des variables lues dans le code — et non
 * un préfixe large comme « SUPABASE_ », qui exposerait aussi
 * SUPABASE_SERVICE_ROLE_KEY (présente dans .env.local et, par erreur, peut-être
 * un jour dans les variables Vercel). S39-13, préparation de la mise en ligne.
 */
export const BROWSER_ENV_PREFIXES = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_DEMO_MODE",
  "BASE_DOMAIN",
  "GOOGLE_CALENDAR_CLIENT_ID",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_TENANT_ID",
];

/** Variables qui ne doivent JAMAIS atteindre le navigateur. */
export const SERVER_ONLY_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "PAPPERS_API_KEY",
  "DROPCONTACT_API_KEY",
  "SMARTLEAD_API_KEY",
  "SMARTLEAD_WEBHOOK_SECRET",
  "LEMLIST_API_KEY",
  "GOOGLE_CALENDAR_CLIENT_SECRET",
  "MICROSOFT_CLIENT_SECRET",
];

/** Pure : Vite exposerait-il cette variable avec ces préfixes ? (même règle que Vite : « commence par »). */
export function isExposedToBrowser(name: string, prefixes: string[] = BROWSER_ENV_PREFIXES): boolean {
  return prefixes.some((p) => name.startsWith(p));
}
