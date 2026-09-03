// Edge Function Supabase (Deno) — crée un événement sur le calendrier
// Google/Microsoft connecté de l'appelant, depuis /settings/calendar
// (apps/crm). Authentifiée (JWT de l'appelant, jamais un staff_id fourni
// en paramètre) mais appelée en CORS depuis le navigateur -> gestion
// explicite de OPTIONS + en-têtes CORS dès le départ, --no-verify-jwt au
// déploiement (même structure que calendar-update-event — la leçon du
// bug calendar-my-events, où verify_jwt plateforme bloquait le preflight,
// est appliquée directement ici).
//
// Ne fait QUE créer l'événement côté fournisseur externe et retourner son
// id — l'insertion de la ligne `meetings` correspondante se fait côté
// client (RLS staff_full_access autorise déjà l'insert direct pour un
// membre staff, contrairement au flux public calendar-book-meeting qui
// doit passer par service_role).

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { createGoogleEvent } from "../../../packages/calendar/src/googleCalendar.ts";
import { createMicrosoftEvent } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { resolveConnectionByStaffIdAndProvider } from "../_shared/calendarConnection.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

const bodySchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  title: z.string().trim().min(1),
  startIso: z.string().min(1),
  endIso: z.string().min(1),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

  let env;
  try {
    env = loadCalendarFunctionEnv(Deno.env.toObject());
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, 400);
  const { provider, title, startIso, endIso } = parsed.data;

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return jsonResponse({ error: "Configuration serveur incomplète (ANON KEY)" }, 500);
  const userClient = createClient(env.SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Session invalide" }, 401);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const connection = await resolveConnectionByStaffIdAndProvider(supabase, env, userData.user.id, provider);
    if (!connection) return jsonResponse({ error: "Calendrier non connecté" }, 404);

    let eventId: string;
    if (provider === "google") {
      const event = await createGoogleEvent({ accessToken: connection.accessToken, summary: title, startIso, endIso });
      eventId = event.id;
    } else {
      const event = await createMicrosoftEvent({ accessToken: connection.accessToken, subject: title, startIso, endIso });
      eventId = event.id;
    }

    return jsonResponse({ id: eventId, provider }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
