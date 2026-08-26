import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectStatus } from "@dmh/types";

export interface ProspectListRow {
  id: string;
  status: ProspectStatus;
  companies: { name: string; ai_score: number | null } | null;
  contacts: { first_name: string; last_name: string } | null;
  dmh_clients: { name: string } | null;
}

export async function listProspects(client: SupabaseClient): Promise<ProspectListRow[]> {
  const { data, error } = await client
    .from("prospects")
    .select("id, status, companies(name, ai_score), contacts(first_name, last_name), dmh_clients(name)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProspectListRow[];
}

export interface ProspectDetailRow {
  id: string;
  status: ProspectStatus;
  companies: {
    name: string;
    legal_form: string | null;
    naf_label: string | null;
    employee_range: string | null;
    city: string | null;
    revenue: number | null;
    ai_score: number | null;
    ai_score_reason: string | null;
  } | null;
  contacts: {
    first_name: string;
    last_name: string;
    job_title: string | null;
    email: string | null;
    email_confidence: string | null;
    linkedin_url: string | null;
  } | null;
}

export async function getProspect(client: SupabaseClient, id: string): Promise<ProspectDetailRow> {
  const { data, error } = await client
    .from("prospects")
    .select(
      "id, status, companies(name, legal_form, naf_label, employee_range, city, revenue, ai_score, ai_score_reason), contacts(first_name, last_name, job_title, email, email_confidence, linkedin_url)",
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ProspectDetailRow;
}

export async function updateProspectStatus(
  client: SupabaseClient,
  id: string,
  status: ProspectStatus,
): Promise<void> {
  const { error } = await client.from("prospects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
