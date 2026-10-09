import type { SupabaseClient } from "@supabase/supabase-js";
import type { Form, FormSubmission } from "@dmh/types";
import type { FormPayload } from "../lib/formEditor";

/** S39-10 — formulaires du client, plus récents d'abord. */
export async function listForms(client: SupabaseClient, clientId: string): Promise<Form[]> {
  const { data, error } = await client.from("forms").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Form[];
}

/** Crée (sans `id`) ou met à jour un formulaire ; lien déjà pris → message lisible. */
export async function saveForm(client: SupabaseClient, clientId: string, payload: FormPayload, id?: string): Promise<void> {
  const row = { ...payload, client_id: clientId, updated_at: new Date().toISOString() };
  const { error } = id ? await client.from("forms").update(row).eq("id", id) : await client.from("forms").insert(row);
  if (error) throw new Error(error.code === "23505" ? "Ce lien est déjà utilisé par un autre formulaire." : error.message);
}

export async function deleteForm(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("forms").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface FormSubmissionRow extends FormSubmission {
  contacts: { first_name: string; last_name: string; email: string | null } | null;
}

/** S39-12 — dernières réponses d'un formulaire, avec le contact rattaché. */
export async function listFormSubmissions(client: SupabaseClient, formId: string, limit = 50): Promise<FormSubmissionRow[]> {
  const { data, error } = await client
    .from("form_submissions")
    .select("id, form_id, client_id, data, contact_id, created_at, contacts(first_name, last_name, email)")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FormSubmissionRow[];
}
