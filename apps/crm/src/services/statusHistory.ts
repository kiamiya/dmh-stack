import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectStatus } from "@dmh/types";

export interface StatusHistoryRow {
  prospect_id: string;
  new_status: ProspectStatus;
  changed_at: string;
}

/** Alimente le funnel de conversion (Phase 3) — nécessite la migration 010_add_crm_activity_tracking.sql. */
export async function listStatusHistory(client: SupabaseClient): Promise<StatusHistoryRow[]> {
  const { data, error } = await client.from("prospect_status_history").select("prospect_id, new_status, changed_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as StatusHistoryRow[];
}
