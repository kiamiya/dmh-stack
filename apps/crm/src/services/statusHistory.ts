import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectStatus } from "@dmh/types";

export interface StatusHistoryRow {
  prospect_id: string;
  old_status: ProspectStatus | null;
  new_status: ProspectStatus;
  changed_by: string | null;
  changed_at: string;
}

/** Alimente le funnel de conversion (Phase 3) et le fil d'activité (Phase 5) — nécessite la migration 010_add_crm_activity_tracking.sql. */
export async function listStatusHistory(client: SupabaseClient): Promise<StatusHistoryRow[]> {
  const { data, error } = await client
    .from("prospect_status_history")
    .select("prospect_id, old_status, new_status, changed_by, changed_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as StatusHistoryRow[];
}
