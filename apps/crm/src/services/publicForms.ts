import type { FormField } from "@dmh/forms";
import type { CustomFieldSpec, RawValue } from "@dmh/forms";

/** S39-11 — champ tel que renvoyé par `form-public` (action `get`). */
export type PublicFormField =
  | { id: string; kind: "standard"; key: Extract<FormField, { kind: "standard" }>["key"]; label: string; required: boolean }
  | { id: string; kind: "custom"; label: string; required: boolean; fieldType: CustomFieldSpec["field_type"]; options: string[] };

export interface PublicForm {
  title: string;
  description: string | null;
  submitLabel: string;
  consentText: string | null;
  fields: PublicFormField[];
}

export class PublicFormError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function call<T>(base: string, body: Record<string, unknown>, fetchImpl: typeof fetch): Promise<T> {
  const res = await fetchImpl(`${base}/form-public`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PublicFormError(data.error ?? "Erreur inconnue", res.status, data.fields ?? {});
  return data as T;
}

export function fetchPublicForm(base: string, slug: string, fetchImpl: typeof fetch = fetch) {
  return call<{ form: PublicForm }>(base, { action: "get", slug }, fetchImpl);
}

export function submitPublicForm(base: string, slug: string, values: Record<string, RawValue>, website: string, fetchImpl: typeof fetch = fetch) {
  return call<{ ok: true; successMessage: string; redirectUrl: string | null }>(base, { action: "submit", slug, values, website }, fetchImpl);
}

/**
 * Pure : reconstitue, à partir de la vue publique, les champs et définitions
 * attendus par `validateSubmission` — pour valider dans le navigateur avec
 * exactement la même règle que le serveur (l'id du champ tient lieu d'id de
 * définition, le serveur ne renvoyant jamais ces derniers).
 */
export function toValidationInput(fields: PublicFormField[]): { fields: FormField[]; specs: CustomFieldSpec[] } {
  return {
    fields: fields.map((f) =>
      f.kind === "standard"
        ? { id: f.id, kind: "standard", key: f.key, label: f.label, required: f.required }
        : { id: f.id, kind: "custom", fieldDefinitionId: f.id, label: f.label, required: f.required },
    ),
    specs: fields
      .filter((f): f is Extract<PublicFormField, { kind: "custom" }> => f.kind === "custom")
      .map((f) => ({ id: f.id, field_type: f.fieldType, select_options: f.options })),
  };
}
