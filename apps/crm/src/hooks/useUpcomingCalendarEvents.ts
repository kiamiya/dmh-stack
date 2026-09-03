import { useEffect, useState } from "react";
import { useSession } from "../lib/useSession";
import { calendarOAuthConfig } from "../lib/supabase";
import { fetchMyUpcomingEvents } from "../services/calendarEvents";
import type { UpcomingCalendarEvent } from "../services/calendarEvents";

export function useUpcomingCalendarEvents() {
  const { session } = useSession();
  const [events, setEvents] = useState<UpcomingCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchMyUpcomingEvents(accessToken, calendarOAuthConfig.functionsBaseUrl)
      .then(setEvents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return { events, loading, error };
}
