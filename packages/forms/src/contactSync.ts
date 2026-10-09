// S39-12 — report d'une réponse de formulaire sur la fiche contact (CR du
// 09/10/2026 : « remontée directe des données dans le CRM »). Contact
// retrouvé par e-mail : on COMPLÈTE uniquement ce qui est vide, jamais une
// valeur déjà saisie dans le CRM (même règle que « Compléter » à l'import,
// S38-3). Nouveau contact : créé avec toutes les valeurs.
//
// Module autonome (import de types uniquement), importable par Deno.

import type { StandardFieldKey } from "./config.ts";

/** Colonnes de `contacts` alimentées par les champs standards (la société et le message ont un traitement à part). */
export const CONTACT_COLUMN_BY_FIELD: Partial<Record<StandardFieldKey, "first_name" | "last_name" | "phone" | "job_title">> = {
  first_name: "first_name",
  last_name: "last_name",
  phone: "phone",
  job_title: "job_title",
};

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
}

/** Pure : colonnes du contact existant à compléter (vides en base, renseignées dans la réponse). */
export function fillEmptyContactPatch(
  existing: Partial<Record<"first_name" | "last_name" | "phone" | "job_title", string | null>>,
  standard: Partial<Record<StandardFieldKey, string>>,
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const [field, column] of Object.entries(CONTACT_COLUMN_BY_FIELD) as Array<[StandardFieldKey, "first_name" | "last_name" | "phone" | "job_title"]>) {
    const incoming = standard[field];
    if (incoming && isEmpty(existing[column])) patch[column] = incoming;
  }
  return patch;
}

/** Pure : valeurs de champs personnalisés à écrire (définitions sans valeur actuelle pour ce contact). */
export function customValuesToWrite(
  existing: Map<string, unknown>,
  incoming: Record<string, string | number | boolean | string[]>,
): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = {};
  for (const [definitionId, value] of Object.entries(incoming)) {
    if (isEmpty(existing.get(definitionId))) out[definitionId] = value;
  }
  return out;
}
