// S39-11 — validation d'une réponse de formulaire (CR du 09/10/2026 :
// champs contrôlés — téléphone avec pays et format, e-mail sans espace).
// Utilisée à l'identique par la page publique et par l'Edge Function.
//
// Module autonome (import de types uniquement), importable par Deno.

import type { FormField, StandardFieldKey } from "./config.ts";

/** Pays proposés pour le téléphone (France par défaut), avec leur indicatif. */
export const PHONE_COUNTRIES: Array<{ code: string; name: string; dial: string }> = [
  { code: "FR", name: "France", dial: "33" },
  { code: "BE", name: "Belgique", dial: "32" },
  { code: "CH", name: "Suisse", dial: "41" },
  { code: "LU", name: "Luxembourg", dial: "352" },
  { code: "MC", name: "Monaco", dial: "377" },
  { code: "DE", name: "Allemagne", dial: "49" },
  { code: "ES", name: "Espagne", dial: "34" },
  { code: "IT", name: "Italie", dial: "39" },
  { code: "NL", name: "Pays-Bas", dial: "31" },
  { code: "PT", name: "Portugal", dial: "351" },
  { code: "GB", name: "Royaume-Uni", dial: "44" },
  { code: "IE", name: "Irlande", dial: "353" },
  { code: "US", name: "États-Unis / Canada", dial: "1" },
  { code: "MA", name: "Maroc", dial: "212" },
  { code: "TN", name: "Tunisie", dial: "216" },
  { code: "DZ", name: "Algérie", dial: "213" },
];

/**
 * Pure : numéro au format international E.164 à partir du pays choisi et du
 * numéro saisi. Accepte les espaces, points, tirets, parenthèses ; un 0
 * initial (format national) est retiré ; un numéro déjà en « +… » ou « 00… »
 * garde son propre indicatif. Pour la France : exactement 9 chiffres après
 * l'indicatif. Null si inexploitable.
 */
export function normalizePhoneForCountry(countryCode: string, input: string): string | null {
  const compact = input.replace(/[\s.\-()]/g, "");
  if (!compact) return null;
  let e164: string;
  if (/^\+\d+$/.test(compact)) e164 = compact;
  else if (/^00\d+$/.test(compact)) e164 = `+${compact.slice(2)}`;
  else if (/^\d+$/.test(compact)) {
    const country = PHONE_COUNTRIES.find((c) => c.code === countryCode);
    if (!country) return null;
    e164 = `+${country.dial}${compact.replace(/^0/, "")}`;
  } else return null;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  if (e164.startsWith("+33") && !/^\+33[1-9]\d{8}$/.test(e164)) return null;
  return e164;
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Définition de champ personnalisé utile à la validation (options déjà résolues pour le client). */
export interface CustomFieldSpec {
  id: string;
  field_type: "text" | "number" | "date" | "boolean" | "select" | "multiselect";
  select_options: string[] | null;
}

export type RawValue = string | boolean | string[] | undefined;

export interface ValidSubmission {
  standard: Partial<Record<StandardFieldKey, string>>;
  /** Valeurs des champs personnalisés, par `fieldDefinitionId`, au format de `custom_field_values.value`. */
  custom: Record<string, string | number | boolean | string[]>;
}

const MAX_TEXT = 2000;

/**
 * Pure : valide les réponses (`values` indexées par id de champ ; le pays du
 * téléphone dans `values["<id>__country"]`). Erreurs indexées par id de champ.
 */
export function validateSubmission(
  fields: FormField[],
  values: Record<string, RawValue>,
  customSpecs: CustomFieldSpec[],
): { value: ValidSubmission | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const result: ValidSubmission = { standard: {}, custom: {} };

  for (const field of fields) {
    const raw = values[field.id];
    const text = typeof raw === "string" ? raw.trim() : "";

    if (field.kind === "standard") {
      if (!text) {
        if (field.required) errors[field.id] = "Champ obligatoire.";
        continue;
      }
      if (text.length > MAX_TEXT) {
        errors[field.id] = "Texte trop long.";
        continue;
      }
      if (field.key === "email") {
        const email = text.toLowerCase();
        if (!isValidEmailAddress(email)) errors[field.id] = "Adresse e-mail invalide (sans espace, ex. prenom.nom@societe.fr).";
        else result.standard.email = email;
      } else if (field.key === "phone") {
        const country = typeof values[`${field.id}__country`] === "string" ? (values[`${field.id}__country`] as string) : "FR";
        const phone = normalizePhoneForCountry(country, text);
        if (!phone) errors[field.id] = "Numéro invalide pour le pays choisi.";
        else result.standard.phone = phone;
      } else {
        result.standard[field.key] = text;
      }
      continue;
    }

    const spec = customSpecs.find((s) => s.id === field.fieldDefinitionId);
    if (!spec) continue; // champ supprimé du CRM depuis : ignoré
    if (spec.field_type === "boolean") {
      if (field.required && raw !== true) errors[field.id] = "Case à cocher obligatoire.";
      else if (raw === true || raw === false) result.custom[spec.id] = raw;
      continue;
    }
    if (spec.field_type === "multiselect") {
      const list = Array.isArray(raw) ? raw.filter((v) => (spec.select_options ?? []).includes(v)) : [];
      if (field.required && list.length === 0) errors[field.id] = "Choisissez au moins une option.";
      else if (list.length > 0) result.custom[spec.id] = list;
      continue;
    }
    if (!text) {
      if (field.required) errors[field.id] = "Champ obligatoire.";
      continue;
    }
    if (spec.field_type === "number") {
      const n = Number(text.replace(",", "."));
      if (!Number.isFinite(n)) errors[field.id] = "Nombre attendu.";
      else result.custom[spec.id] = n;
    } else if (spec.field_type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) errors[field.id] = "Date invalide.";
      else result.custom[spec.id] = text;
    } else if (spec.field_type === "select") {
      if (!(spec.select_options ?? []).includes(text)) errors[field.id] = "Choix invalide.";
      else result.custom[spec.id] = text;
    } else if (text.length > MAX_TEXT) {
      errors[field.id] = "Texte trop long.";
    } else {
      result.custom[spec.id] = text;
    }
  }

  if (Object.keys(errors).length > 0) return { value: null, errors };
  return { value: result, errors };
}

/** Pure : nom d'entreprise à utiliser quand le formulaire n'en demande pas — domaine de l'e-mail, ou « Particulier » pour une messagerie grand public. */
export function companyNameFallback(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const personal = ["gmail.com", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "yahoo.com", "yahoo.fr", "orange.fr", "free.fr", "sfr.fr", "laposte.net", "icloud.com", "live.fr", "wanadoo.fr"];
  return !domain || personal.includes(domain) ? "Particulier" : domain;
}
