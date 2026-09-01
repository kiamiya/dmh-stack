import { describe, expect, it } from "vitest";
import { daysSince, formatRelativeTime } from "./relativeTime";

const NOW = new Date("2026-08-26T12:00:00Z");

describe("formatRelativeTime", () => {
  it("retourne — pour une date nulle", () => {
    expect(formatRelativeTime(null, NOW)).toBe("—");
  });

  it("retourne à l'instant pour moins d'une minute", () => {
    expect(formatRelativeTime("2026-08-26T11:59:30Z", NOW)).toBe("à l'instant");
  });

  it("retourne des minutes pour moins d'une heure", () => {
    expect(formatRelativeTime("2026-08-26T11:30:00Z", NOW)).toBe("il y a 30 min");
  });

  it("retourne des heures pour moins d'un jour", () => {
    expect(formatRelativeTime("2026-08-26T06:00:00Z", NOW)).toBe("il y a 6 h");
  });

  it("retourne des jours pour moins de 30 jours", () => {
    expect(formatRelativeTime("2026-08-21T12:00:00Z", NOW)).toBe("il y a 5 j");
  });

  it("retourne une date formatée FR au-delà de 30 jours", () => {
    expect(formatRelativeTime("2026-06-01T12:00:00Z", NOW)).toBe("le 01/06/2026");
  });
});

describe("daysSince", () => {
  it("retourne null pour une date nulle", () => {
    expect(daysSince(null, NOW)).toBeNull();
  });

  it("retourne le nombre de jours entiers écoulés", () => {
    expect(daysSince("2026-08-12T12:00:00Z", NOW)).toBe(14);
  });

  it("retourne 0 pour une date du jour même", () => {
    expect(daysSince("2026-08-26T01:00:00Z", NOW)).toBe(0);
  });
});
