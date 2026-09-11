import { daysSince } from "./relativeTime";

/**
 * Fraîcheur d'enrichissement en jours ("2j"), format compact du mockup
 * Claude Design — `isoDate` doit être un `updated_at` bumpé uniquement
 * par un enrichissement réel (`enrich-pappers`/`enrich-dropcontact`),
 * jamais par une édition manuelle (cf. migration 039).
 */
export function formatFreshnessDays(isoDate: string | null, now: Date = new Date()): string {
  const days = daysSince(isoDate, now);
  if (days === null) return "—";
  return `${days}j`;
}
