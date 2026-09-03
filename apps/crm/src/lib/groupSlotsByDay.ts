export interface Slot {
  start: string;
  end: string;
}

export interface DaySlotGroup {
  dateLabel: string;
  slots: Slot[];
}

/** Pure : regroupe des créneaux ISO par jour (UTC), triés chronologiquement, avec un libellé FR lisible. */
export function groupSlotsByDay(slots: Slot[]): DaySlotGroup[] {
  const byDay = new Map<string, Slot[]>();
  for (const slot of slots) {
    const day = slot.start.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(slot);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, daySlots]) => ({
      dateLabel: new Date(`${day}T00:00:00Z`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
      slots: daySlots,
    }));
}
