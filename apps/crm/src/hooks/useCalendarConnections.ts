import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { disconnectMyCalendar, listMyConnections } from "../services/calendarConnections";
import type { CalendarConnection } from "../services/calendarConnections";

export function useCalendarConnections() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return listMyConnections(supabase)
      .then(setConnections)
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function disconnect(connectionId: string): Promise<void> {
    await disconnectMyCalendar(supabase, connectionId);
    await load();
  }

  return { connections, loading, disconnect, reload: load };
}
