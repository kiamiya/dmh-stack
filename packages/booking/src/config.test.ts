import { describe, expect, it } from "vitest";
import { isValidPageSlug, isValidSlug, normalizeQuestions, normalizeWeeklyAvailability, parseTimeOfDay, slugify } from "./config.js";

describe("parseTimeOfDay", () => {
  it("convertit HH:MM en minutes, refuse le reste", () => {
    expect(parseTimeOfDay("09:30")).toBe(570);
    expect(parseTimeOfDay("23:59")).toBe(1439);
    expect(parseTimeOfDay("24:00")).toBeNull();
    expect(parseTimeOfDay("9:30")).toBeNull();
    expect(parseTimeOfDay(930)).toBeNull();
  });
});

describe("normalizeWeeklyAvailability", () => {
  it("garde les plages valides, triées", () => {
    expect(
      normalizeWeeklyAvailability([
        { day: 3, start: "14:00", end: "17:00" },
        { day: 1, start: "09:00", end: "12:00" },
        { day: 3, start: "09:00", end: "12:00" },
      ]),
    ).toEqual([
      { day: 1, start: "09:00", end: "12:00" },
      { day: 3, start: "09:00", end: "12:00" },
      { day: 3, start: "14:00", end: "17:00" },
    ]);
  });

  it("écarte jour hors 0-6, heures invalides, fin avant début, non-tableau", () => {
    expect(
      normalizeWeeklyAvailability([
        { day: 7, start: "09:00", end: "12:00" },
        { day: 1, start: "12:00", end: "09:00" },
        { day: 1, start: "12:00", end: "12:00" },
        { day: 1.5, start: "09:00", end: "10:00" },
        null,
        "x",
      ]),
    ).toEqual([]);
    expect(normalizeWeeklyAvailability({})).toEqual([]);
  });
});

describe("normalizeQuestions", () => {
  it("valide les questions, dédoublonne les choix, exige un choix pour select", () => {
    expect(
      normalizeQuestions([
        { id: "q1", label: " Taille de l'équipe ", type: "select", required: true, options: ["1-10", "1-10", " 11-50 ", ""] },
        { id: "q2", label: "Contexte", type: "textarea" },
        { id: "q3", label: "Vide", type: "select", options: [] },
        { id: "q1", label: "Doublon", type: "text" },
        { id: "q4", label: "", type: "text" },
        { id: "q5", label: "Inconnu", type: "phone" },
      ]),
    ).toEqual([
      { id: "q1", label: "Taille de l'équipe", type: "select", required: true, options: ["1-10", "11-50"] },
      { id: "q2", label: "Contexte", type: "textarea", required: false },
    ]);
  });

  it("renvoie [] pour une valeur qui n'est pas un tableau", () => {
    expect(normalizeQuestions(null)).toEqual([]);
  });
});

describe("slugify / isValidSlug", () => {
  it("produit un identifiant d'URL valide", () => {
    expect(slugify("  Démo Produit — 30 min ! ")).toBe("demo-produit-30-min");
    expect(isValidSlug(slugify("Été & Cie"))).toBe(true);
    expect(isValidSlug("Demo")).toBe(false);
    expect(isValidSlug("demo--x")).toBe(false);
    expect(isValidSlug("-demo")).toBe(false);
  });
});

describe("isValidPageSlug", () => {
  it("refuse le slug réservé « gerer »", () => {
    expect(isValidPageSlug("acme")).toBe(true);
    expect(isValidPageSlug("gerer")).toBe(false);
    expect(isValidPageSlug("gerer-acme")).toBe(true);
  });
});
