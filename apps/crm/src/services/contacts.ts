import type { SupabaseClient } from "@supabase/supabase-js";

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
