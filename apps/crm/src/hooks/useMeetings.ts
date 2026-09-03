import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listMeetings } from "../services/meetings";
import type { MeetingRow } from "../services/meetings";

/** Toutes les réunions visibles par l'appelant — filtrées côté client par contact/entreprise/opportunité, même convention que useTasks/useOpportunities pour les fiches détail. */
export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listMeetings(supabase)
      .then(setMeetings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { meetings, loading, error, reload: load };
}
