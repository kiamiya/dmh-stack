import { useCallback, useEffect, useState } from "react";
import { useSession } from "../lib/useSession";
import { calendarOAuthConfig } from "../lib/supabase";
import { fetchMyUpcomingEvents, updateCalendarEvent } from "../services/calendarEvents";
import type { CalendarEventUpdate, UpcomingCalendarEvent } from "../services/calendarEvents";

export function useUpcomingCalendarEvents() {
  const { session } = useSession();
  const [events, setEvents] = useState<UpcomingCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return fetchMyUpcomingEvents(accessToken, calendarOAuthConfig.functionsBaseUrl)
      .then(setEvents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateEvent(provider: "google" | "microsoft", eventId: string, patch: CalendarEventUpdate): Promise<void> {
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error("Session invalide");
    await updateCalendarEvent(accessToken, calendarOAuthConfig.functionsBaseUrl, provider, eventId, patch);
    await load();
  }

  return { events, loading, error, updateEvent, reload: load };
}
