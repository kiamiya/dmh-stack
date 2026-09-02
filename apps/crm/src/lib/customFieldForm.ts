import type { CustomFieldType } from "@dmh/types";

const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

/** Pure : dérive une clé de champ stable depuis son libellé (minuscules, sans accents, `_` comme séparateur). */
export function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Pure : parse la saisie brute "option1, option2, option3" en liste nettoyée. */
export function parseSelectOptions(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export interface CustomFieldFormInput {
  label: string;
  fieldType: CustomFieldType;
  selectOptionsRaw: string;
  existingKeys: string[];
}

/** Pure : valide le formulaire "Ajouter un champ personnalisé". Retourne un message d'erreur FR, ou `null` si valide. */
export function validateCustomFieldForm({
  label,
  fieldType,
  selectOptionsRaw,
  existingKeys,
}: CustomFieldFormInput): string | null {
  if (!label.trim()) return "Le libellé est requis.";

  const key = slugifyFieldKey(label);
  if (!key) return "Le libellé doit contenir au moins une lettre ou un chiffre.";
  if (existingKeys.includes(key)) return "Un champ avec cette clé existe déjà pour ce type d'objet.";

  if (fieldType === "select" && parseSelectOptions(selectOptionsRaw).length === 0) {
    return "Au moins une option est requise pour un champ de type liste.";
  }

  return null;
}
