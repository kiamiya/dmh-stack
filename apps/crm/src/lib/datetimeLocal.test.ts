import { describe, expect, it } from "vitest";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "./datetimeLocal";

describe("toDatetimeLocalValue", () => {
  it("formate un ISO en valeur locale YYYY-MM-DDTHH:mm", () => {
    const iso = new Date(2026, 8, 7, 10, 30).toISOString();
    expect(toDatetimeLocalValue(iso)).toBe("2026-09-07T10:30");
  });

  it("complète les minutes/heures à un chiffre avec un zéro", () => {
    const iso = new Date(2026, 0, 5, 9, 5).toISOString();
    expect(toDatetimeLocalValue(iso)).toBe("2026-01-05T09:05");
  });
});

describe("fromDatetimeLocalValue", () => {
  it("interprète la valeur en heure locale et retourne un ISO équivalent", () => {
    const expected = new Date(2026, 8, 7, 10, 30).toISOString();
    expect(fromDatetimeLocalValue("2026-09-07T10:30")).toBe(expected);
  });

  it("est l'inverse de toDatetimeLocalValue", () => {
    const iso = new Date(2026, 8, 7, 10, 30).toISOString();
    expect(fromDatetimeLocalValue(toDatetimeLocalValue(iso))).toBe(iso);
  });
});
