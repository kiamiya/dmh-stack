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
