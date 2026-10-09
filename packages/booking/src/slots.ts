// S39-4 — créneaux proposés sur la page de réservation (CR du 09/10/2026) :
// plages hebdomadaires définies à la main (heure locale du type de RDV,
// Europe/Paris par défaut, changements d'heure compris) MOINS les
// événements de l'agenda connecté de l'hôte et ses RDV déjà pris, avec la
// pause entre deux RDV et le délai minimum de prévenance.
//
// Module autonome (import de types uniquement), importable par Deno.

import type { WeeklyRange } from "./config.ts";

export interface BusyInterval {
  /** ISO 8601 */
  start: string;
  end: string;
}

export interface BookingSlot {
  /** ISO 8601 UTC */
  start: string;
  end: string;
}

export interface SlotRules {
  weeklyAvailability: WeeklyRange[];
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
}

const MINUTE = 60_000;

/** Décalage (ms) du fuseau `timeZone` par rapport à UTC à l'instant `utcMs`. */
export function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Instant UTC (ms) correspondant à `minutes` après minuit, le jour `y-m-d` (mois 1-12), heure locale de `timeZone`. */
export function zonedTimeToUtcMs(y: number, m: number, d: number, minutes: number, timeZone: string): number {
  const naive = Date.UTC(y, m - 1, d, 0, minutes);
  let utc = naive - timeZoneOffsetMs(naive, timeZone);
  // Deuxième passe : l'offset peut changer entre l'heure « naïve » et l'heure réelle (jour du changement d'heure).
  const second = naive - timeZoneOffsetMs(utc, timeZone);
  if (second !== utc) utc = second;
  return utc;
}

/** Date calendaire locale (y, m 1-12, d) de l'instant `utcMs` dans `timeZone`. */
export function localDate(utcMs: number, timeZone: string): { y: number; m: number; d: number } {
  const shifted = new Date(utcMs + timeZoneOffsetMs(utcMs, timeZone));
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Pure : créneaux libres entre maintenant + délai minimum et maintenant +
 * horizon. Les créneaux se suivent toutes les `durée + pause` minutes à
 * partir du début de chaque plage ; un créneau est écarté s'il chevauche
 * un intervalle occupé élargi de la pause (avant comme après).
 */
export function computeBookingSlots(rules: SlotRules, busy: BusyInterval[], now: Date): BookingSlot[] {
  const { weeklyAvailability, timezone, durationMinutes, bufferMinutes, minNoticeHours, maxDaysAhead } = rules;
  const step = durationMinutes + bufferMinutes;
  const earliest = now.getTime() + minNoticeHours * 60 * MINUTE;
  const latest = now.getTime() + maxDaysAhead * 24 * 60 * MINUTE;
  const blocked = busy
    .map((b) => ({ start: new Date(b.start).getTime() - bufferMinutes * MINUTE, end: new Date(b.end).getTime() + bufferMinutes * MINUTE }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));

  const today = localDate(now.getTime(), timezone);
  const slots: BookingSlot[] = [];
  for (let offset = 0; offset <= maxDaysAhead; offset++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + offset));
    const [y, m, d, weekday] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), day.getUTCDay()];
    for (const range of weeklyAvailability.filter((r) => r.day === weekday)) {
      const rangeEnd = toMinutes(range.end);
      for (let t = toMinutes(range.start); t + durationMinutes <= rangeEnd; t += step) {
        const start = zonedTimeToUtcMs(y, m, d, t, timezone);
        const end = start + durationMinutes * MINUTE;
        if (start < earliest || start > latest) continue;
        if (blocked.some((b) => start < b.end && end > b.start)) continue;
        slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
      }
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/** Pure : le créneau demandé fait-il partie des créneaux proposés ? (garde-fou serveur à la réservation) */
export function isOfferedSlot(slots: BookingSlot[], startIso: string): BookingSlot | null {
  const t = new Date(startIso).getTime();
  return slots.find((s) => new Date(s.start).getTime() === t) ?? null;
}
