export interface BusyInterval {
  start: string;
  end: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export interface AvailabilityOptions {
  slotDurationMinutes: number;
  businessStartHour: number;
  businessEndHour: number;
  /** Jours ouvrés, 0 = dimanche ... 6 = samedi. Par défaut lundi-vendredi. */
  businessDays?: number[];
}

/**
 * Pure : calcule les créneaux libres dans `[windowStart, windowEnd)` en
 * excluant les intervalles occupés (`busy`), les créneaux déjà passés
 * (par rapport à `now`) et hors heures/jours ouvrés. Tout en UTC — pas de
 * gestion de fuseau horaire spécifique par utilisateur en v1 (limite
 * assumée, cf. PROGRESS.md).
 */
export function computeAvailableSlots(
  busy: BusyInterval[],
  windowStart: Date,
  windowEnd: Date,
  options: AvailabilityOptions,
  now: Date = new Date(),
): AvailableSlot[] {
  const { slotDurationMinutes, businessStartHour, businessEndHour, businessDays = [1, 2, 3, 4, 5] } = options;
  const busyRanges = busy.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }));

  const slots: AvailableSlot[] = [];
  const cursor = new Date(windowStart);
  cursor.setUTCSeconds(0, 0);

  while (cursor.getTime() < windowEnd.getTime()) {
    const day = cursor.getUTCDay();
    const hour = cursor.getUTCHours();

    if (businessDays.includes(day) && hour >= businessStartHour && hour < businessEndHour) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + slotDurationMinutes * 60_000);
      const overlapsBusy = busyRanges.some((b) => slotStart.getTime() < b.end && slotEnd.getTime() > b.start);
      const isPast = slotStart.getTime() < now.getTime();

      if (!overlapsBusy && !isPast && slotEnd.getTime() <= windowEnd.getTime()) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }

    cursor.setUTCMinutes(cursor.getUTCMinutes() + slotDurationMinutes);
  }

  return slots;
}
