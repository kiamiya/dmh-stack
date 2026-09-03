import { useMemo, useState } from "react";
import { buildMonthGrid } from "../lib/monthGrid";
import { groupEventsByDate } from "../lib/calendarEventGrid";
import { Badge } from "./ui/badge";
import type { UpcomingCalendarEvent } from "../services/calendarEvents";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MAX_VISIBLE_PER_DAY = 3;
const PROVIDER_VARIANT = { google: "blue", microsoft: "purple" } as const;

export interface CalendarEventGridProps {
  events: UpcomingCalendarEvent[];
  onSelectEvent: (event: UpcomingCalendarEvent) => void;
}

export function CalendarEventGrid({ events, onSelectEvent }: CalendarEventGridProps) {
  const [cursor, setCursor] = useState(() => new Date());

  const weeks = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const eventsByDay = useMemo(() => groupEventsByDate(events), [events]);

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-secondary px-2 py-1 text-center font-medium text-muted-foreground">
            {label}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const dayEvents = eventsByDay[day.date] ?? [];
          const overflow = dayEvents.length - MAX_VISIBLE_PER_DAY;
          return (
            <div
              key={day.date}
              className={`min-h-24 space-y-1 bg-card p-1 ${day.inCurrentMonth ? "" : "opacity-40"}`}
            >
              <div className={`text-right ${day.isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                {day.dayOfMonth}
              </div>
              {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className="block w-full truncate rounded px-1 py-0.5 text-left hover:opacity-80"
                >
                  <Badge variant={PROVIDER_VARIANT[event.provider]} className="w-full justify-start truncate">
                    {new Date(event.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} {event.title}
                  </Badge>
                </button>
              ))}
              {overflow > 0 && <div className="text-muted-foreground">+{overflow} de plus</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
