import { useCallback, useEffect, useState } from "react";
import type { ProspectStatus } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { listProspects, updateProspectAssignment, updateProspectStatus } from "../services/prospects";
import type { ProspectListRow } from "../services/prospects";

export function useProspects() {
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

  /** Actions groupées : appliquent le changement en local (optimiste) puis persistent chaque prospect en parallèle. */
  async function bulkUpdateStatus(ids: string[], status: ProspectStatus): Promise<{ ok: boolean; error?: string }> {
    const previous = prospects;
    setProspects((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status } : p)));
    try {
      await Promise.all(ids.map((id) => updateProspectStatus(supabase, id, status)));
      return { ok: true };
    } catch (err) {
      setProspects(previous);
      return { ok: false, error: (err as Error).message };
    }
  }

  async function bulkUpdateAssignment(
    ids: string[],
    assignedTo: string | null,
  ): Promise<{ ok: boolean; error?: string }> {
    const previous = prospects;
    setProspects((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, assigned_to: assignedTo } : p)));
    try {
      await Promise.all(ids.map((id) => updateProspectAssignment(supabase, id, assignedTo)));
      return { ok: true };
    } catch (err) {
      setProspects(previous);
      return { ok: false, error: (err as Error).message };
    }
  }

  return { prospects, loading, error, reload: load, bulkUpdateStatus, bulkUpdateAssignment };
}
