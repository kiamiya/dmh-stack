/** S39-5 — créneaux de la page publique groupés par jour, affichés dans le fuseau du type de RDV (Europe/Paris par défaut). */
export interface SlotView {
  start: string;
  end: string;
  timeLabel: string;
}

export interface SlotDayGroup {
  dayKey: string;
  dateLabel: string;
  slots: SlotView[];
}

export function formatSlotDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone, dateStyle: "full", timeStyle: "short" }).format(new Date(iso));
}

/** Pure : regroupe des créneaux (ISO UTC, déjà triés) par jour local de `timeZone`. */
export function groupSlotsByLocalDay(slots: Array<{ start: string; end: string }>, timeZone: string): SlotDayGroup[] {
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const dayLabel = new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long" });
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  const groups: SlotDayGroup[] = [];
  for (const slot of slots) {
    const date = new Date(slot.start);
    const key = dayKey.format(date);
    let group = groups.find((g) => g.dayKey === key);
    if (!group) {
      group = { dayKey: key, dateLabel: dayLabel.format(date), slots: [] };
      groups.push(group);
    }
    group.slots.push({ start: slot.start, end: slot.end, timeLabel: time.format(date) });
  }
  return groups;
}
