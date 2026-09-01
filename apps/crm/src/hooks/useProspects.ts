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

  /**
   * Annule une action groupée : restaure chaque prospect à sa PROPRE
   * valeur antérieure (potentiellement différente d'un prospect à
   * l'autre si la sélection n'était pas homogène avant l'action groupée)
   * — pas un simple "remettre à une valeur commune".
   */
  async function restoreStatuses(entries: Array<{ id: string; status: ProspectStatus }>): Promise<void> {
    const byId = new Map(entries.map((e) => [e.id, e.status]));
    setProspects((prev) => prev.map((p) => (byId.has(p.id) ? { ...p, status: byId.get(p.id)! } : p)));
    await Promise.all(entries.map((e) => updateProspectStatus(supabase, e.id, e.status)));
  }

  async function restoreAssignments(entries: Array<{ id: string; assignedTo: string | null }>): Promise<void> {
    const byId = new Map(entries.map((e) => [e.id, e.assignedTo]));
    setProspects((prev) => prev.map((p) => (byId.has(p.id) ? { ...p, assigned_to: byId.get(p.id)! } : p)));
    await Promise.all(entries.map((e) => updateProspectAssignment(supabase, e.id, e.assignedTo)));
  }

  return {
    prospects,
    loading,
    error,
    reload: load,
    bulkUpdateStatus,
    bulkUpdateAssignment,
    restoreStatuses,
    restoreAssignments,
  };
}
