import { daysSince } from "./relativeTime";

/** Prédicats purs des chips "Filtres rapides" (correction Claude Design, S34) — chacun sur une donnée réelle, jamais un chiffre inventé. */

export function isEmailVerified(contact: { email_confidence: string | null }): boolean {
  return contact.email_confidence === "valid";
}

export function hasPhone(entity: { phone: string | null }): boolean {
  return Boolean(entity.phone && entity.phone.trim());
}

export function hasSiren(company: { siren: string | null }): boolean {
  return Boolean(company.siren && company.siren.trim());
}

export function isCompleteAbove(threshold: number, percent: number): boolean {
  return percent >= threshold;
}

export function isFreshUnderDays(maxDays: number, isoDate: string | null, now: Date = new Date()): boolean {
  const days = daysSince(isoDate, now);
  return days !== null && days < maxDays;
}

/** Complément de `isFreshUnderDays` — "non travaillée depuis N jours" (Segments). Une date absente compte comme "jamais travaillée", donc vrai. */
export function isStaleOverDays(minDays: number, isoDate: string | null, now: Date = new Date()): boolean {
  const days = daysSince(isoDate, now);
  return days === null || days >= minDays;
}

/**
 * Pure : extrait le premier nombre d'une tranche d'effectif Pappers
 * (ex. "Entre 2 000 et 4 999 salariés" → 2000, "50-250" → 50, "10 000
 * salariés et plus" → 10000) — sert de borne basse approximative pour
 * le chip "Effectif ≥ N" (une tranche n'a pas de valeur exacte, on
 * utilise honnêtement son propre texte plutôt qu'un chiffre inventé).
 * `null` si aucun nombre n'est trouvé.
 */
export function extractMinEmployeeCount(employeeRange: string | null): number | null {
  if (!employeeRange) return null;
  const digitsOnly = employeeRange.replace(/[\s ]+(?=\d)/g, ""); // "2 000" -> "2000" (espace = séparateur de milliers)
  const match = digitsOnly.match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function hasMinEmployeeCount(threshold: number, employeeRange: string | null): boolean {
  const value = extractMinEmployeeCount(employeeRange);
  return value !== null && value >= threshold;
}
