export interface CalendarDay {
  /** Format "YYYY-MM-DD", clé stable pour grouper/comparer les jours. */
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Pure : construit une grille de 6 semaines (42 jours, lundi en premier —
 * convention française) pour le mois donné, en complétant avec les jours
 * des mois adjacents pour que chaque semaine soit toujours pleine. Générique
 * — utilisée aussi bien pour le calendrier des tâches (taskCalendar.ts) que
 * pour celui des événements de calendrier externe (calendarEventGrid.ts).
 */
export function buildMonthGrid(year: number, month: number, today: Date = new Date()): CalendarDay[][] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayStartIndex = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayStartIndex);
  const todayKey = toDateKey(today);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    days.push({
      date: toDateKey(d),
      dayOfMonth: d.getDate(),
      inCurrentMonth: d.getMonth() === month,
      isToday: toDateKey(d) === todayKey,
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
