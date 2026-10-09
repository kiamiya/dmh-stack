import { normalizeFormFields } from "@dmh/forms";
import type { FormField } from "@dmh/forms";
import type { Form } from "@dmh/types";

/** S39-10 — état éditable d'un formulaire dans le CRM. */
export interface FormEditorValues {
  name: string;
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  submitLabel: string;
  successMessage: string;
  redirectUrl: string;
  consentText: string;
  active: boolean;
}

export interface FormPayload {
  name: string;
  slug: string;
  title: string;
  description: string | null;
  fields: FormField[];
  submit_label: string;
  success_message: string;
  redirect_url: string | null;
  consent_text: string | null;
  active: boolean;
}

export const DEFAULT_CONSENT_TEXT =
  "Les informations recueillies sont utilisées uniquement pour répondre à votre demande. Vous pouvez demander à tout moment leur rectification ou leur suppression.";

export function formToEditor(row: Form): FormEditorValues {
  return {
    name: row.name,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    fields: normalizeFormFields(row.fields),
    submitLabel: row.submit_label,
    successMessage: row.success_message,
    redirectUrl: row.redirect_url ?? "",
    consentText: row.consent_text ?? "",
    active: row.active,
  };
}

/** Pure : déplace un champ d'un cran (ordre d'affichage du formulaire). */
export function moveField(fields: FormField[], index: number, direction: -1 | 1): FormField[] {
  const target = index + direction;
  if (target < 0 || target >= fields.length) return fields;
  const next = [...fields];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Pure : valide le formulaire édité et produit la ligne à écrire. */
export function buildFormPayload(values: FormEditorValues, slugify: (s: string) => string): { payload: FormPayload | null; errors: string[] } {
  const errors: string[] = [];
  const name = values.name.trim();
  const title = values.title.trim() || name;
  const slug = values.slug.trim() || slugify(name);
  if (!name) errors.push("Le nom est obligatoire.");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push("Le lien ne peut contenir que des minuscules, chiffres et tirets.");
  if (values.fields.some((f) => !f.label.trim())) errors.push("Chaque champ doit avoir un libellé.");
  const fields = normalizeFormFields(values.fields.map((f) => ({ ...f, label: f.label.trim() })));
  if (!values.submitLabel.trim()) errors.push("Le texte du bouton est obligatoire.");
  if (!values.successMessage.trim()) errors.push("Le message de confirmation est obligatoire.");
  const redirectUrl = values.redirectUrl.trim();
  if (redirectUrl && !/^https:\/\/\S+$/.test(redirectUrl)) errors.push("La page de remerciement doit être une adresse https://.");
  if (errors.length > 0) return { payload: null, errors };
  return {
    payload: {
      name,
      slug,
      title,
      description: values.description.trim() || null,
      fields,
      submit_label: values.submitLabel.trim(),
      success_message: values.successMessage.trim(),
      redirect_url: redirectUrl || null,
      consent_text: values.consentText.trim() || null,
      active: values.active,
    },
    errors: [],
  };
}

export function publicFormUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, "")}/f/${slug}`;
}
