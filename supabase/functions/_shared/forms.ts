// Code partagé des formulaires (S39-11/12, CR du 09/10/2026) : chargement
// d'un formulaire public et des champs personnalisés qu'il utilise, avec les
// options propres au client. Importé, jamais déployé seul.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Form } from "../../../packages/types/src/index.ts";
import { normalizeFormFields } from "../../../packages/forms/src/config.ts";
import type { FormField } from "../../../packages/forms/src/config.ts";
import type { CustomFieldSpec } from "../../../packages/forms/src/submission.ts";

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
