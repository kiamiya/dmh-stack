// Code partagé des formulaires (S39-11/12, CR du 09/10/2026) : chargement
// d'un formulaire public et des champs personnalisés qu'il utilise, avec les
// options propres au client. Importé, jamais déployé seul.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Form } from "../../../packages/types/src/index.ts";
import { normalizeFormFields } from "../../../packages/forms/src/config.ts";
import type { FormField } from "../../../packages/forms/src/config.ts";
import type { CustomFieldSpec, ValidSubmission } from "../../../packages/forms/src/submission.ts";
import { companyNameFallback } from "../../../packages/forms/src/submission.ts";
import { customValuesToWrite, fillEmptyContactPatch } from "../../../packages/forms/src/contactSync.ts";
import { escapeLikePattern, findCompanyByName } from "../../../packages/booking/src/crmLink.ts";

export async function loadActiveForm(supabase: SupabaseClient, slug: string): Promise<{ form: Form; fields: FormField[] } | null> {
  const { data, error } = await supabase.from("forms").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const form = data as Form;
  return { form, fields: normalizeFormFields(form.fields) };
}

/** Champs personnalisés (fiche contact) utilisés par le formulaire, options surchargées pour le client (S38-6). */
export async function loadCustomSpecs(supabase: SupabaseClient, clientId: string, fields: FormField[]): Promise<CustomFieldSpec[]> {
  const ids = fields.filter((f) => f.kind === "custom").map((f) => (f as { fieldDefinitionId: string }).fieldDefinitionId);
  if (ids.length === 0) return [];
  const [{ data: defs, error }, { data: overrides, error: overridesError }] = await Promise.all([
    supabase
      .from("custom_field_definitions")
      .select("id, client_id, is_system, entity_type, field_type, select_options")
      .in("id", ids)
      .eq("entity_type", "contact"),
    supabase.from("custom_field_client_options").select("field_definition_id, select_options").eq("client_id", clientId).in("field_definition_id", ids),
  ]);
  if (error) throw new Error(error.message);
  if (overridesError) throw new Error(overridesError.message);
  const overrideById = new Map((overrides ?? []).map((o) => [o.field_definition_id as string, o.select_options as string[]]));
  return (defs ?? [])
    // Un champ d'un autre client ne doit jamais être exposé ni écrit.
    .filter((d) => d.is_system || d.client_id === clientId)
    .map((d) => ({
      id: d.id as string,
      field_type: d.field_type as CustomFieldSpec["field_type"],
      select_options: overrideById.get(d.id as string) ?? (d.select_options as string[] | null),
    }));
}

/** Empreinte SHA-256 de l'IP + jour + formulaire (limitation des envois, jamais l'IP en clair). */
export async function ipFingerprint(req: Request, formId: string): Promise<string | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${day}|${formId}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * S39-12 — reporte une réponse sur la fiche contact du client : contact
 * retrouvé par e-mail et COMPLÉTÉ (champs vides uniquement), sinon créé avec
 * son entreprise (retrouvée par nom ou créée ; à défaut de champ « Société »,
 * domaine de l'e-mail ou « Particulier »). Base juridique d'un nouveau
 * contact : « consentement » (envoi volontaire du formulaire, mention RGPD
 * affichée). Retourne l'id du contact.
 */
export async function syncSubmissionToContact(supabase: SupabaseClient, clientId: string, value: ValidSubmission): Promise<string> {
  const email = value.standard.email!;
  const { data: existing, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, job_title")
    .eq("client_id", clientId)
    .ilike("email", escapeLikePattern(email))
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  let contactId: string;
  if (existing) {
    contactId = existing.id as string;
    const patch = fillEmptyContactPatch(existing, value.standard);
    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase.from("contacts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", contactId);
      if (updateError) throw new Error(updateError.message);
    }
  } else {
    const companyName = value.standard.company || companyNameFallback(email);
    const { data: companies, error: companiesError } = await supabase.from("companies").select("id, name").eq("client_id", clientId);
    if (companiesError) throw new Error(companiesError.message);
    let companyId = findCompanyByName((companies ?? []) as Array<{ id: string; name: string }>, companyName)?.id ?? null;
    if (!companyId) {
      const { data: created, error: createError } = await supabase.from("companies").insert({ client_id: clientId, name: companyName }).select("id").single();
      if (createError) throw new Error(createError.message);
      companyId = created.id as string;
    }
    const { data: contact, error: insertError } = await supabase
      .from("contacts")
      .insert({
        client_id: clientId,
        company_id: companyId,
        first_name: value.standard.first_name ?? "",
        last_name: value.standard.last_name ?? "",
        email,
        phone: value.standard.phone ?? null,
        job_title: value.standard.job_title ?? null,
        legal_basis: "consent",
        data_source: "manual",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    contactId = contact.id as string;
    const { error: relationError } = await supabase
      .from("contact_companies")
      .insert({ client_id: clientId, contact_id: contactId, company_id: companyId, is_primary: true });
    if (relationError) throw new Error(relationError.message);
  }

  const definitionIds = Object.keys(value.custom);
  if (definitionIds.length > 0) {
    const { data: current, error: valuesError } = await supabase
      .from("custom_field_values")
      .select("field_definition_id, value")
      .eq("entity_id", contactId)
      .in("field_definition_id", definitionIds);
    if (valuesError) throw new Error(valuesError.message);
    const toWrite = customValuesToWrite(new Map((current ?? []).map((v) => [v.field_definition_id as string, v.value])), value.custom);
    const rows = Object.entries(toWrite).map(([field_definition_id, v]) => ({
      client_id: clientId,
      entity_type: "contact",
      entity_id: contactId,
      field_definition_id,
      value: v,
    }));
    if (rows.length > 0) {
      const { error: upsertError } = await supabase.from("custom_field_values").upsert(rows, { onConflict: "entity_id,field_definition_id" });
      if (upsertError) throw new Error(upsertError.message);
    }
  }
  return contactId;
}
