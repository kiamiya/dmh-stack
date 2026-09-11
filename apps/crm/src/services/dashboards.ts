import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dashboard } from "@dmh/types";

const DASHBOARD_SELECT = "id, owner_id, name, blocks, position, created_at, updated_at";

/** Dashboards nommés du membre du staff connecté (RLS `owner_full_access` — jamais ceux d'un autre). */
export async function listDashboards(client: SupabaseClient): Promise<Dashboard[]> {
  const { data, error } = await client.from("dashboards").select(DASHBOARD_SELECT).order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Dashboard[];
}

export interface DashboardInsert {
  ownerId: string;
  name: string;
  blocks?: string[];
  position?: number;
}

export async function createDashboard(client: SupabaseClient, input: DashboardInsert): Promise<Dashboard> {
  const { data, error } = await client
    .from("dashboards")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      blocks: input.blocks ?? [],
      position: input.position ?? 0,
    })
    .select(DASHBOARD_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Dashboard;
}

export interface DashboardUpdate {
  name?: string;
  blocks?: string[];
  position?: number;
}

export async function updateDashboard(client: SupabaseClient, id: string, patch: DashboardUpdate): Promise<void> {
  const { error } = await client
    .from("dashboards")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.blocks !== undefined && { blocks: patch.blocks }),
      ...(patch.position !== undefined && { position: patch.position }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteDashboard(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("dashboards").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Copie superficielle (nom suffixé "(copie)", mêmes blocs) — même principe que dupliquer une vue enregistrée (S34-4) ou un dossier (S34-9). */
export async function duplicateDashboard(client: SupabaseClient, dashboard: Dashboard): Promise<Dashboard> {
  return createDashboard(client, {
    ownerId: dashboard.owner_id,
    name: `${dashboard.name} (copie)`,
    blocks: dashboard.blocks,
    position: dashboard.position,
  });
}
