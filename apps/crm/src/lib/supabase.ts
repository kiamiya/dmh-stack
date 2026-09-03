import { createClient } from "@supabase/supabase-js";
import { loadPublicEnv } from "@dmh/config";
import { createMockSupabaseClient } from "./mockSupabase";

function loadEnv() {
  return loadPublicEnv({
    SUPABASE_URL: import.meta.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
    BASE_DOMAIN: import.meta.env.BASE_DOMAIN,
    GOOGLE_CALENDAR_CLIENT_ID: import.meta.env.GOOGLE_CALENDAR_CLIENT_ID,
    MICROSOFT_CLIENT_ID: import.meta.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_TENANT_ID: import.meta.env.MICROSOFT_TENANT_ID,
  });
}

/**
 * Client Supabase avec la clé anonyme uniquement — jamais la clé
 * service_role côté navigateur. La sécurité réelle (accès staff à tous
 * les clients) vient des policies RLS (voir
 * supabase/migrations/005_add_staff_members.sql), pas de ce client.
 *
 * `SUPABASE_DEMO_MODE=true` (local uniquement, `.env.local`, jamais
 * commité) bascule sur un faux client en mémoire — utilisé quand le vrai
 * projet Supabase est injoignable (ex. mis en pause), pour continuer à
 * travailler sur l'UI/les fonctionnalités du CRM sans backend réel.
 */
const isDemoMode = import.meta.env.SUPABASE_DEMO_MODE === "true";
const env = isDemoMode ? null : loadEnv();

export const supabase = isDemoMode
  ? (createMockSupabaseClient() as unknown as ReturnType<typeof createClient>)
  : createClient(env!.SUPABASE_URL, env!.SUPABASE_ANON_KEY);

/** Identifiants OAuth publics (client ID/tenant ID — jamais un secret) pour construire les URLs d'autorisation Google/Microsoft (S16). */
export const calendarOAuthConfig = {
  googleClientId: env?.GOOGLE_CALENDAR_CLIENT_ID ?? "",
  microsoftClientId: env?.MICROSOFT_CLIENT_ID ?? "",
  microsoftTenantId: env?.MICROSOFT_TENANT_ID ?? "",
  /** Base des Edge Functions Supabase — les callbacks OAuth y répondent (google-calendar-oauth-callback, etc.). */
  functionsBaseUrl: env ? `${env.SUPABASE_URL}/functions/v1` : "",
};
