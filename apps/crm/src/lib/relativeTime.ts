const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formate une date ISO en temps relatif FR ("à l'instant", "il y a 3 h",
 * "il y a 5 j", "le 12/03/2026" au-delà de 30 jours) — pas de dépendance
 * (date-fns etc.), le besoin est trop limité pour le justifier.
 */
export function formatRelativeTime(isoDate: string | null, now: Date = new Date()): string {
  if (!isoDate) return "—";

  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < MINUTE) return "à l'instant";
  if (diffMs < HOUR) return `il y a ${Math.floor(diffMs / MINUTE)} min`;
  if (diffMs < DAY) return `il y a ${Math.floor(diffMs / HOUR)} h`;
  if (diffMs < 30 * DAY) return `il y a ${Math.floor(diffMs / DAY)} j`;

  return `le ${date.toLocaleDateString("fr-FR")}`;
}

/** Nombre de jours entiers écoulés depuis une date ISO — base du seuil "stagnant" (Phase 5). */
export function daysSince(isoDate: string | null, now: Date = new Date()): number | null {
  if (!isoDate) return null;
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY);
}
