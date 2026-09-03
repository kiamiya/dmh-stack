import { useCallback, useEffect, useState } from "react";
import { useSession } from "../lib/useSession";
import { calendarOAuthConfig, supabase } from "../lib/supabase";
import { createCalendarEvent, fetchMyUpcomingEvents, updateCalendarEvent } from "../services/calendarEvents";
import type { CalendarEventUpdate, UpcomingCalendarEvent } from "../services/calendarEvents";
import { createMeeting } from "../services/meetings";

export interface NewCalendarEventInput {
  title: string;
  startIso: string;
  endIso: string;
  clientId: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}

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

  /** Crée l'événement côté fournisseur externe (Google/Microsoft) PUIS la ligne `meetings` correspondante (insert direct, RLS staff_full_access l'autorise). */
  async function addEvent(provider: "google" | "microsoft", input: NewCalendarEventInput): Promise<void> {
    const accessToken = session?.access_token;
    const staffId = session?.user.id;
    if (!accessToken || !staffId) throw new Error("Session invalide");
    const { id: externalEventId } = await createCalendarEvent(accessToken, calendarOAuthConfig.functionsBaseUrl, provider, {
      title: input.title,
      startIso: input.startIso,
      endIso: input.endIso,
    });
    await createMeeting(supabase, {
      clientId: input.clientId,
      staffId,
      title: input.title,
      startsAt: input.startIso,
      endsAt: input.endIso,
      contactId: input.contactId,
      companyId: input.companyId,
      dealId: input.dealId,
      externalCalendarProvider: provider,
      externalEventId,
    });
    await load();
  }

  return { events, loading, error, updateEvent, addEvent, reload: load };
}
