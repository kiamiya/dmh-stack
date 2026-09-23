import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listInteractionsForProspects } from "../services/interactions";
import type { InteractionRow } from "../services/interactions";
import { listStatusHistoryForProspects } from "../services/statusHistory";
import type { StatusHistoryRow } from "../services/statusHistory";

/** S38-8 — interactions + historique de statut de tous les prospects d'une entreprise. */
export function useCompanyTimeline(prospectIds: string[]) {
  const key = [...prospectIds].sort().join(",");
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const ids = key ? key.split(",") : [];
    setLoading(true);
    return Promise.all([listInteractionsForProspects(supabase, ids), listStatusHistoryForProspects(supabase, ids)])
      .then(([i, s]) => {
        setInteractions(i);
        setStatusHistory(s);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { interactions, statusHistory, loading, error, reload: load };
}
