import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContactListRow {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  linkedin_url: string | null;
  company_id: string;
  client_id: string;
}

export async function listContacts(client: SupabaseClient): Promise<ContactListRow[]> {
  const { data, error } = await client
    .from("contacts")
    .select("id, first_name, last_name, job_title, email, linkedin_url, company_id, client_id")
    .order("last_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactListRow[];
}

export interface ContactDetailRow {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  email_confidence: string | null;
  linkedin_url: string | null;
  phone: string | null;
  company_id: string;
  companies: { id: string; name: string } | null;
}

const CONTACT_DETAIL_SELECT =
  "id, client_id, first_name, last_name, job_title, email, email_confidence, linkedin_url, phone, company_id, companies(id, name)";

export async function getContact(client: SupabaseClient, id: string): Promise<ContactDetailRow> {
  const { data, error } = await client.from("contacts").select(CONTACT_DETAIL_SELECT).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as unknown as ContactDetailRow;
}

export interface ContactUpdate {
  firstName?: string;
  lastName?: string;
  jobTitle?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
}

export async function updateContact(client: SupabaseClient, id: string, patch: ContactUpdate): Promise<void> {
  const { error } = await client
    .from("contacts")
    .update({
      ...(patch.firstName !== undefined && { first_name: patch.firstName }),
      ...(patch.lastName !== undefined && { last_name: patch.lastName }),
      ...(patch.jobTitle !== undefined && { job_title: patch.jobTitle }),
      ...(patch.email !== undefined && { email: patch.email }),
      ...(patch.linkedinUrl !== undefined && { linkedin_url: patch.linkedinUrl }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface ContactInsert {
  clientId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  email: string | null;
  linkedinUrl: string | null;
}

/** Crée un contact saisi manuellement (ex. identifié sur LinkedIn) — `data_source: "manual"`, voir `@dmh/types`. */
export async function createContact(client: SupabaseClient, input: ContactInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("contacts")
    .insert({
      client_id: input.clientId,
      company_id: input.companyId,
      first_name: input.firstName,
      last_name: input.lastName,
      job_title: input.jobTitle,
      email: input.email,
      linkedin_url: input.linkedinUrl,
      data_source: "manual",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}
