// Edge Function Supabase (Deno) — S41-2 : création de compte DMH depuis
// l'écran de connexion du CRM, réservée aux adresses @dmhassocies.com.
//
// Publique (déployée --no-verify-jwt : la personne n'a pas encore de compte).
// POST { name, email, origin } :
//   - le domaine est vérifié ICI (le contrôle du formulaire n'est qu'un
//     confort) — `isDmhStaffEmail`, packages/config/src/staffSignup.ts ;
//   - Supabase envoie un e-mail d'invitation ; le lien ramène sur
//     `<origin>/reset-password?invite=1` pour choisir le mot de passe ;
//   - l'accès staff n'est accordé qu'à la confirmation de l'adresse (clic sur
//     le lien), par le trigger de la migration 059 — taper l'adresse d'un
//     collègue ne donne donc rien.
// Les comptes clients ne passent jamais par ici : ils seront créés par DMH.

import { createClient } from "@supabase/supabase-js";
import { loadStaffSignupFunctionEnv } from "../../../packages/config/src/env.ts";
import { BROWSER_CORS_HEADERS, corsPreflightResponse } from "../../../packages/config/src/cors.ts";
import { normalizeEmail, validateStaffSignup } from "../../../packages/config/src/staffSignup.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...BROWSER_CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflightResponse(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { name?: string; email?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  const name = (body.name ?? "").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(body.email ?? "");
  const validationError = validateStaffSignup({ name, email });
  if (validationError) return jsonResponse({ error: validationError }, 400);

  // Origine du CRM (adresse en ligne ou locale) : seule la page de choix du
  // mot de passe est visée. Supabase n'accepte de toute façon que les
  // adresses de retour autorisées dans sa configuration.
  const origin = (body.origin ?? "").replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+$/.test(origin)) return jsonResponse({ error: "Origine invalide" }, 400);

  let env;
  try {
    env = loadStaffSignupFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${origin}/reset-password?invite=1`,
  });

  if (!error) return jsonResponse({ ok: true, status: "invited" }, 200);
  if (error.status === 422 || /already been registered|already registered|email_exists/i.test(`${error.message} ${error.code ?? ""}`)) {
    return jsonResponse({ ok: true, status: "already_registered" }, 200);
  }
  if (error.status === 429 || /rate limit/i.test(error.message)) {
    return jsonResponse({ error: "Trop de demandes envoyées : réessaie dans une heure." }, 429);
  }
  return jsonResponse({ error: error.message }, 502);
});
