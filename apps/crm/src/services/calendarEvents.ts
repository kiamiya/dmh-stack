export interface UpcomingCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  provider: "google" | "microsoft";
}

/** Appelle l'Edge Function calendar-my-events (authentifiée — JWT vérifié par le code de la fonction, pas de client Supabase ici car c'est un simple GET HTTP). */
export async function fetchMyUpcomingEvents(
  accessToken: string,
  functionsBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UpcomingCalendarEvent[]> {
  const res = await fetchImpl(`${functionsBaseUrl}/calendar-my-events`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
  return data.events;
}

export interface CalendarEventUpdate {
  title?: string;
  startIso?: string;
  endIso?: string;
}

/** Appelle l'Edge Function calendar-update-event pour modifier un événement sur le calendrier externe (Google/Microsoft) de l'appelant. */
export async function updateCalendarEvent(
  accessToken: string,
  functionsBaseUrl: string,
  provider: "google" | "microsoft",
  eventId: string,
  patch: CalendarEventUpdate,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`${functionsBaseUrl}/calendar-update-event`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ provider, eventId, title: patch.title, startIso: patch.startIso, endIso: patch.endIso }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
}
