// Edge Function Supabase (Deno) — modifie un événement (titre/horaires) sur
// le calendrier Google/Microsoft connecté de l'appelant, depuis la grille
// visuelle de /settings/calendar (apps/crm). Authentifiée (JWT de
// l'appelant, jamais un staff_id fourni en paramètre) mais appelée en CORS
// depuis le navigateur -> gestion explicite de OPTIONS + en-têtes CORS dès
// le départ (bug déjà rencontré et corrigé sur calendar-my-events : la
// vérification JWT plateforme bloque le preflight, d'où --no-verify-jwt au
// déploiement et cette vérification manuelle à la place).

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { updateGoogleEvent } from "../../../packages/calendar/src/googleCalendar.ts";
import { updateMicrosoftEvent } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { resolveConnectionByStaffIdAndProvider } from "../_shared/calendarConnection.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

const bodySchema = z
  .object({
    provider: z.enum(["google", "microsoft"]),
    eventId: z.string().min(1),
    title: z.string().trim().min(1).optional(),
    startIso: z.string().min(1).optional(),
    endIso: z.string().min(1).optional(),
  })
  .refine((v) => v.title !== undefined || v.startIso !== undefined || v.endIso !== undefined, {
    message: "Au moins un champ à modifier (title/startIso/endIso) est requis",
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
  const { provider, eventId, title, startIso, endIso } = parsed.data;

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return jsonResponse({ error: "Configuration serveur incomplète (ANON KEY)" }, 500);
  const userClient = createClient(env.SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Session invalide" }, 401);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const connection = await resolveConnectionByStaffIdAndProvider(supabase, env, userData.user.id, provider);
    if (!connection) return jsonResponse({ error: "Calendrier non connecté" }, 404);

    if (provider === "google") {
      await updateGoogleEvent({ accessToken: connection.accessToken, eventId, summary: title, startIso, endIso });
    } else {
      await updateMicrosoftEvent({ accessToken: connection.accessToken, eventId, subject: title, startIso, endIso });
    }

    return jsonResponse({ id: eventId, provider, title, start: startIso, end: endIso }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
