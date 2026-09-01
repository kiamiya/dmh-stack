import type { SupabaseClient } from "@supabase/supabase-js";

export interface StaffMemberRow {
  id: string;
  name: string;
  email: string;
}

export async function listStaffMembers(client: SupabaseClient): Promise<StaffMemberRow[]> {
  const { data, error } = await client.from("staff_members").select("id, name, email").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffMemberRow[];
}
