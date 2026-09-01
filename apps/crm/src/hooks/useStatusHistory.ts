import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listStatusHistory } from "../services/statusHistory";
import type { StatusHistoryRow } from "../services/statusHistory";

export function useStatusHistory() {
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStatusHistory(supabase)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return { history, loading };
}
