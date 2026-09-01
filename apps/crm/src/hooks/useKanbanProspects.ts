import { useCallback, useEffect, useState } from "react";
import type { ProspectStatus } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { listProspects, updateProspectStatus } from "../services/prospects";
import type { ProspectListRow } from "../services/prospects";

export function useKanbanProspects() {
  const [prospects, setProspects] = useState<ProspectListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listProspects(supabase)
      .then(setProspects)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Optimiste : déplace le prospect immédiatement, revert + message d'erreur si l'update échoue. */
  async function moveProspect(id: string, status: ProspectStatus): Promise<{ ok: boolean; error?: string }> {
    const previous = prospects;
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

    try {
      await updateProspectStatus(supabase, id, status);
      return { ok: true };
    } catch (err) {
      setProspects(previous);
      return { ok: false, error: (err as Error).message };
    }
  }

  return { prospects, loading, error, moveProspect };
}
