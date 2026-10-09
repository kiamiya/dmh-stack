// S39-7 — rappels avant un RDV confirmé (réglage « rappels » du type de RDV,
// CR du 09/10/2026). Appelé périodiquement (pg_cron → booking-reminders).
//
// Module autonome, importable par Deno.

/**
 * Pure : faut-il envoyer un rappel maintenant ? Un rappel « h heures avant »
 * est dû dès que `now` ≥ début − h, tant que le RDV n'a pas commencé. Si
 * plusieurs rappels sont dus en même temps (envoi en retard), UN SEUL
 * e-mail part et tous sont marqués envoyés — jamais de rafale de rappels.
 */
export function dueReminder(
  startIso: string,
  reminderHours: number[],
  alreadySent: number[],
  now: Date,
): { send: boolean; markSent: number[] } {
  const start = new Date(startIso).getTime();
  if (!(now.getTime() < start)) return { send: false, markSent: [] };
  const due = reminderHours.filter((h) => !alreadySent.includes(h) && now.getTime() >= start - h * 3600_000);
  return due.length > 0 ? { send: true, markSent: due } : { send: false, markSent: [] };
}

/**
 * Pure : rappels déjà « couverts » au moment de la confirmation — ceux dont
 * l'heure est déjà passée. L'e-mail de confirmation vient de partir : on ne
 * renvoie pas un rappel quelques minutes après.
 */
export function remindersCoveredAt(startIso: string, reminderHours: number[], at: Date): number[] {
  const start = new Date(startIso).getTime();
  return reminderHours.filter((h) => at.getTime() >= start - h * 3600_000);
}
