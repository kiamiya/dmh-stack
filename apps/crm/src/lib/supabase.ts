import { createClient } from "@supabase/supabase-js";
import { loadPublicEnv } from "@dmh/config";

const env = loadPublicEnv({
  SUPABASE_URL: import.meta.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
  BASE_DOMAIN: import.meta.env.BASE_DOMAIN,
});

/**
 * Client Supabase avec la clé anonyme uniquement — jamais la clé
 * service_role côté navigateur. La sécurité réelle (accès staff à tous
 * les clients) vient des policies RLS (voir
 * supabase/migrations/005_add_staff_members.sql), pas de ce client.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
