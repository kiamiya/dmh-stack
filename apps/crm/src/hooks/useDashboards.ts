import { useCallback, useEffect, useState } from "react";
import type { Dashboard } from "@dmh/types";
import { supabase } from "../lib/supabase";
import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  listDashboards,
  updateDashboard,
} from "../services/dashboards";
import type { DashboardUpdate } from "../services/dashboards";

/** Dashboards nommés personnels (S34-15) — propriétaire résolu depuis la session courante, jamais fabriqué. */
export function useDashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return listDashboards(supabase)
      .then(setDashboards)
      .catch(() => setDashboards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(name: string): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const ownerId = data.session?.user.id;
    if (!ownerId) return;
    await createDashboard(supabase, { ownerId, name, position: dashboards.length });
    await load();
  }

  async function update(id: string, patch: DashboardUpdate): Promise<void> {
    await updateDashboard(supabase, id, patch);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteDashboard(supabase, id);
    await load();
  }

  async function duplicate(dashboard: Dashboard): Promise<void> {
    await duplicateDashboard(supabase, dashboard);
    await load();
  }

  return { dashboards, loading, create, update, remove, duplicate, reload: load };
}
