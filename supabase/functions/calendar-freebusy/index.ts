// Edge Function Supabase (Deno) — S16 : disponibilités publiques pour la
// page de prise de RDV (/book/:token, apps/crm). Appelée directement
// depuis le navigateur d'un prospect non authentifié — d'où les en-têtes
// CORS et l'usage de service_role en interne (RLS bloque tout accès
// anonyme direct à staff_calendar_connections, par design).
//
// Heures/jours ouvrés fixes (9h-18h, lun-ven, créneaux de 30 min) — pas
// de préférence configurable par membre staff en v1, limite assumée.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { computeAvailableSlots } from "../../../packages/calendar/src/availability.ts";
import { fetchGoogleBusyEvents, mapGoogleEventsToBusyIntervals } from "../../../packages/calendar/src/googleCalendar.ts";
import { fetchMicrosoftBusyEvents, mapMicrosoftEventsToBusyIntervals } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { resolveConnectionByBookingToken } from "../_shared/calendarConnection.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

const WINDOW_DAYS = 14;
const AVAILABILITY_OPTIONS = { slotDurationMinutes: 30, businessStartHour: 9, businessEndHour: 18 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return jsonResponse({ error: "Paramètre 'token' manquant" }, 400);

  let env;
  try {
    env = loadCalendarFunctionEnv(Deno.env.toObject());
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const connection = await resolveConnectionByBookingToken(supabase, env, token);
    if (!connection) return jsonResponse({ error: "Lien de réservation invalide" }, 404);

    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

    let busy: Array<{ start: string; end: string }>;
    if (connection.provider === "google") {
      const events = await fetchGoogleBusyEvents({
        accessToken: connection.accessToken,
        timeMin: windowStart.toISOString(),
        timeMax: windowEnd.toISOString(),
      });
      busy = mapGoogleEventsToBusyIntervals(events);
    } else {
      const events = await fetchMicrosoftBusyEvents({
        accessToken: connection.accessToken,
        startIso: windowStart.toISOString(),
        endIso: windowEnd.toISOString(),
      });
      busy = mapMicrosoftEventsToBusyIntervals(events);
    }

    const slots = computeAvailableSlots(busy, windowStart, windowEnd, AVAILABILITY_OPTIONS);
    return jsonResponse({ staffName: connection.staffName, slots }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
