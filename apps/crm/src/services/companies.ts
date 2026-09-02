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
