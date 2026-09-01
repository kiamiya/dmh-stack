import { daysSince } from "./relativeTime";

export const DEFAULT_STAGNATION_THRESHOLD_DAYS = 14;

/**
 * Pure : un prospect est "stagnant" s'il n'a eu aucune interaction depuis
 * plus de `thresholdDays` jours. Un prospect sans `last_activity_at` du
 * tout (jamais contacté) n'est PAS considéré stagnant ici — c'est un état
 * différent ("à démarrer"), pas une perte de rythme sur un dossier engagé.
 */
export function isStagnant(
  lastActivityAt: string | null,
  thresholdDays: number = DEFAULT_STAGNATION_THRESHOLD_DAYS,
  now: Date = new Date(),
): boolean {
  const days = daysSince(lastActivityAt, now);
  return days !== null && days > thresholdDays;
}
