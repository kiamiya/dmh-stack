// Edge Function Supabase (Deno) — S16 : liste des prochains événements du
// calendrier connecté d'un membre staff, pour /settings/calendar
// (apps/crm). Contrairement aux 4 autres fonctions calendrier, appelée
// par un utilisateur Supabase AUTHENTIFIÉ (JWT vérifié par la plateforme,
// pas de --no-verify-jwt au déploiement) — l'identité vient du JWT, pas
// d'un paramètre fourni par l'appelant, pour ne jamais pouvoir demander
// les événements d'un autre membre staff.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { fetchGoogleBusyEvents, mapGoogleEventsToSummaries } from "../../../packages/calendar/src/googleCalendar.ts";
import { fetchMicrosoftBusyEvents, mapMicrosoftEventsToSummaries } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { resolveConnectionsByStaffId } from "../_shared/calendarConnection.ts";
import type { EventSummary } from "../../../packages/calendar/src/googleCalendar.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const WINDOW_DAYS = 14;

Deno.serve(async (req) => {
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

  let env;
  try {
    env = loadCalendarFunctionEnv(Deno.env.toObject());
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  // Client "utilisateur" (clé anon + JWT de l'appelant) — sert uniquement
  // à déterminer QUI appelle, jamais à lire staff_calendar_connections
  // (RLS le bloquerait de toute façon).
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return jsonResponse({ error: "Configuration serveur incomplète (ANON KEY)" }, 500);
  const userClient = createClient(env.SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Session invalide" }, 401);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const connections = await resolveConnectionsByStaffId(supabase, env, userData.user.id);
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const eventsByProvider = await Promise.all(
      connections.map(async (connection) => {
        let summaries: EventSummary[];
        if (connection.provider === "google") {
          const events = await fetchGoogleBusyEvents({
            accessToken: connection.accessToken,
            timeMin: windowStart.toISOString(),
            timeMax: windowEnd.toISOString(),
          });
          summaries = mapGoogleEventsToSummaries(events);
        } else {
          const events = await fetchMicrosoftBusyEvents({
            accessToken: connection.accessToken,
            startIso: windowStart.toISOString(),
            endIso: windowEnd.toISOString(),
          });
          summaries = mapMicrosoftEventsToSummaries(events);
        }
        return summaries.map((s) => ({ ...s, provider: connection.provider }));
      }),
    );

    const events = eventsByProvider.flat().sort((a, b) => a.start.localeCompare(b.start));
    return jsonResponse({ events }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
