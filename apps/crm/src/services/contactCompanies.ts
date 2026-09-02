import type { SupabaseClient } from "@supabase/supabase-js";

export interface CompanyRelationRow {
  id: string;
  company_id: string;
  is_primary: boolean;
  role: string | null;
  companies: { id: string; name: string } | null;
}

export async function listCompaniesForContact(client: SupabaseClient, contactId: string): Promise<CompanyRelationRow[]> {
  const { data, error } = await client
    .from("contact_companies")
    .select("id, company_id, is_primary, role, companies(id, name)")
    .eq("contact_id", contactId)
    .order("is_primary", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CompanyRelationRow[];
}

export interface ContactRelationRow {
  id: string;
  contact_id: string;
  is_primary: boolean;
  role: string | null;
  contacts: { id: string; first_name: string; last_name: string } | null;
}

export async function listContactsForCompany(client: SupabaseClient, companyId: string): Promise<ContactRelationRow[]> {
  const { data, error } = await client
    .from("contact_companies")
    .select("id, contact_id, is_primary, role, contacts(id, first_name, last_name)")
    .eq("company_id", companyId)
    .order("is_primary", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactRelationRow[];
}

export interface ContactCompanyInsert {
  clientId: string;
  contactId: string;
  companyId: string;
  isPrimary?: boolean;
  role?: string | null;
}

export async function addContactCompanyRelation(
  client: SupabaseClient,
  input: ContactCompanyInsert,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("contact_companies")
    .insert({
      client_id: input.clientId,
      contact_id: input.contactId,
      company_id: input.companyId,
      is_primary: input.isPrimary ?? false,
      role: input.role ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function removeContactCompanyRelation(client: SupabaseClient, relationId: string): Promise<void> {
  const { error } = await client.from("contact_companies").delete().eq("id", relationId);
  if (error) throw new Error(error.message);
}
