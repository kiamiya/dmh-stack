// Edge Function Supabase (Deno) — S29 étape 3 : statut des intégrations
// réellement utilisées (Pappers/Dropcontact/Smartlead/Lemlist) pour la
// page /integrations (apps/crm). Ne renvoie qu'un booléen "configuré" par
// fournisseur, jamais la clé elle-même ni un chiffre d'usage/quota
// inventé (aucun suivi réel n'existe encore en base, cf. PROGRESS.md).
//
// Authentification identique à calendar-my-events : JWT de l'appelant
// vérifié via le client "anon", pas de distinction de rôle nécessaire
// (statut des intégrations DMH, pas une donnée par client).

import { createClient } from "@supabase/supabase-js";
import { computeIntegrationStatuses } from "../../../packages/config/src/integrations.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return jsonResponse({ error: "Configuration serveur incomplète" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Session invalide" }, 401);

  const integrations = computeIntegrationStatuses(Deno.env.toObject());
  return jsonResponse({ integrations }, 200);
});
