import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listStatusHistory } from "../services/statusHistory";
import type { StatusHistoryRow } from "../services/statusHistory";

export function useStatusHistory() {
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return listStatusHistory(supabase)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { history, loading, reload: load };
}
