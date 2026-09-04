import type { SupabaseClient } from "@supabase/supabase-js";

export interface CompanyOption {
  id: string;
  name: string;
}

export async function listCompaniesForClient(client: SupabaseClient, clientId: string): Promise<CompanyOption[]> {
  const { data, error } = await client
    .from("companies")
    .select("id, name")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CompanyOption[];
}

export interface CompanyListRow {
  id: string;
  name: string;
  city: string | null;
  naf_label: string | null;
  ai_score: number | null;
  client_id: string;
}

/** Toutes les entreprises, tous clients confondus — pour la vue `/companies` (réservée au staff via `staff_full_access`). */
export async function listAllCompanies(client: SupabaseClient): Promise<CompanyListRow[]> {
  const { data, error } = await client
    .from("companies")
    .select("id, name, city, naf_label, ai_score, client_id")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CompanyListRow[];
}

export interface CompanyDetailRow {
  id: string;
  client_id: string;
  name: string;
  siren: string | null;
  legal_form: string | null;
  naf_label: string | null;
  employee_range: string | null;
  city: string | null;
  website: string | null;
  revenue: number | null;
  ai_score: number | null;
  ai_score_reason: string | null;
  contact_list_id: string | null;
}

const COMPANY_DETAIL_SELECT =
  "id, client_id, name, siren, legal_form, naf_label, employee_range, city, website, revenue, ai_score, ai_score_reason, contact_list_id";

export async function getCompany(client: SupabaseClient, id: string): Promise<CompanyDetailRow> {
  const { data, error } = await client.from("companies").select(COMPANY_DETAIL_SELECT).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as CompanyDetailRow;
}

export interface CompanyUpdate {
  name?: string;
  city?: string | null;
  website?: string | null;
  contactListId?: string | null;
}

export async function updateCompany(client: SupabaseClient, id: string, patch: CompanyUpdate): Promise<void> {
  const { error } = await client
    .from("companies")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.city !== undefined && { city: patch.city }),
      ...(patch.website !== undefined && { website: patch.website }),
      ...(patch.contactListId !== undefined && { contact_list_id: patch.contactListId }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface CompanyInsert {
  clientId: string;
  name: string;
  city: string | null;
  website: string | null;
}

/**
 * Crée une entreprise saisie manuellement (ex. repérée sur LinkedIn, avant
 * même d'avoir un contact). `naf_label`/`siren`/etc. restent `null` — seul
 * l'enrichissement Pappers peut les remplir, comme pour l'import Pharow
 * (voir `packages/pharow/src/mapper.ts`).
 */
export async function createCompany(client: SupabaseClient, input: CompanyInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("companies")
    .insert({
      client_id: input.clientId,
      name: input.name,
      city: input.city,
      website: input.website,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}
