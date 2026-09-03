import type { SupabaseClient } from "@supabase/supabase-js";

export interface CalendarConnection {
  id: string;
  provider: "google" | "microsoft";
  provider_account_email: string | null;
  booking_token: string;
  created_at: string;
}

/** `get_my_calendar_connections()` (migration 022) — ne renvoie jamais les tokens, filtré côté serveur sur l'appelant. */
export async function listMyConnections(client: SupabaseClient): Promise<CalendarConnection[]> {
  const { data, error } = await client.rpc("get_my_calendar_connections");
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarConnection[];
}

export async function disconnectMyCalendar(client: SupabaseClient, connectionId: string): Promise<void> {
  const { error } = await client.rpc("disconnect_my_calendar", { connection_id: connectionId });
  if (error) throw new Error(error.message);
}
