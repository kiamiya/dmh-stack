export interface UpcomingCalendarEvent {
  title: string;
  start: string;
  end: string;
  provider: "google" | "microsoft";
}

/** Appelle l'Edge Function calendar-my-events (authentifiée — JWT vérifié par la plateforme, pas de client Supabase ici car c'est un simple GET HTTP). */
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
