// Edge Function Supabase (Deno) — S16 : réservation publique d'un créneau
// (/book/:token, apps/crm). Appelée directement depuis le navigateur d'un
// prospect non authentifié, comme calendar-freebusy (voir ses
// commentaires pour le contexte CORS/service_role).
//
// Le lien de réservation partagé porte le client DMH en query param
// (`?client=<id>`) — le booking_token seul identifie le membre staff,
// pas le client concerné (un même membre staff peut servir plusieurs
// clients DMH). Limite UX assumée en v1 : pas de sélecteur de client
// dans l'UI de partage du lien, cf. PROGRESS.md.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { createGoogleEvent, fetchGoogleBusyEvents, mapGoogleEventsToBusyIntervals } from "../../../packages/calendar/src/googleCalendar.ts";
import { createMicrosoftEvent, fetchMicrosoftBusyEvents, mapMicrosoftEventsToBusyIntervals } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { resolveConnectionByBookingToken } from "../_shared/calendarConnection.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

interface BookRequestBody {
  token?: string;
  clientId?: string;
  slotStart?: string;
  slotEnd?: string;
  guestName?: string;
  guestEmail?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: BookRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  const { token, clientId, slotStart, slotEnd, guestName, guestEmail, contactId, companyId, dealId } = body;
  if (!token || !clientId || !slotStart || !slotEnd || !guestName || !guestEmail) {
    return jsonResponse({ error: "Champs requis manquants (token, clientId, slotStart, slotEnd, guestName, guestEmail)" }, 400);
  }

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

    // Re-vérifie que le créneau est toujours libre (garde-fou contre une
    // réservation concurrente entre l'affichage des disponibilités et la
    // confirmation).
    let busy: Array<{ start: string; end: string }>;
    if (connection.provider === "google") {
      const events = await fetchGoogleBusyEvents({ accessToken: connection.accessToken, timeMin: slotStart, timeMax: slotEnd });
      busy = mapGoogleEventsToBusyIntervals(events);
    } else {
      const events = await fetchMicrosoftBusyEvents({ accessToken: connection.accessToken, startIso: slotStart, endIso: slotEnd });
      busy = mapMicrosoftEventsToBusyIntervals(events);
    }
    const slotStartMs = new Date(slotStart).getTime();
    const slotEndMs = new Date(slotEnd).getTime();
    const stillFree = !busy.some((b) => slotStartMs < new Date(b.end).getTime() && slotEndMs > new Date(b.start).getTime());
    if (!stillFree) {
      return jsonResponse({ error: "Ce créneau vient d'être pris, merci d'en choisir un autre." }, 409);
    }

    const title = `RDV avec ${guestName}`;
    let externalEventId: string;
    if (connection.provider === "google") {
      const event = await createGoogleEvent({ accessToken: connection.accessToken, summary: title, startIso: slotStart, endIso: slotEnd, guestEmail });
      externalEventId = event.id;
    } else {
      const event = await createMicrosoftEvent({ accessToken: connection.accessToken, subject: title, startIso: slotStart, endIso: slotEnd, guestEmail, guestName });
      externalEventId = event.id;
    }

    const { data: meeting, error: insertError } = await supabase
      .from("meetings")
      .insert({
        client_id: clientId,
        staff_id: connection.staffId,
        contact_id: contactId ?? null,
        company_id: companyId ?? null,
        deal_id: dealId ?? null,
        title,
        starts_at: slotStart,
        ends_at: slotEnd,
        external_calendar_provider: connection.provider,
        external_event_id: externalEventId,
        guest_name: guestName,
        guest_email: guestEmail,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    return jsonResponse({ success: true, meetingId: meeting.id }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
