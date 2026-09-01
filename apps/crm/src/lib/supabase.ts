import { createClient } from "@supabase/supabase-js";
import { loadPublicEnv } from "@dmh/config";
import { createMockSupabaseClient } from "./mockSupabase";

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
function createRealClient() {
  const env = loadPublicEnv({
    SUPABASE_URL: import.meta.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
    BASE_DOMAIN: import.meta.env.BASE_DOMAIN,
  });
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export const supabase =
  import.meta.env.SUPABASE_DEMO_MODE === "true"
    ? (createMockSupabaseClient() as unknown as ReturnType<typeof createClient>)
    : createRealClient();
