import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

interface Row {
  name: string;
  score: number;
}

const COLUMNS = [
  { header: "Nom", value: (r: Row) => r.name },
  { header: "Score", value: (r: Row) => String(r.score) },
];

describe("toCsv", () => {
  it("génère l'en-tête et les lignes", () => {
    const rows: Row[] = [{ name: "Acme", score: 5 }, { name: "Autre", score: 8 }];
    expect(toCsv(rows, COLUMNS)).toBe("Nom,Score\nAcme,5\nAutre,8");
  });

  it("échappe les valeurs contenant une virgule ou un guillemet", () => {
    const rows: Row[] = [{ name: 'Acme, "test"', score: 1 }];
    expect(toCsv(rows, COLUMNS)).toBe('Nom,Score\n"Acme, ""test""",1');
  });

  it("échappe une valeur contenant un saut de ligne", () => {
    const rows: Row[] = [{ name: "Ligne1\nLigne2", score: 1 }];
    expect(toCsv(rows, COLUMNS)).toBe('Nom,Score\n"Ligne1\nLigne2",1');
  });

  it("retourne juste l'en-tête pour un tableau vide", () => {
    expect(toCsv([], COLUMNS)).toBe("Nom,Score");
  });
});

describe("parseCsv", () => {
  it("parse l'en-tête et les lignes", () => {
    expect(parseCsv("Nom,Score\nAcme,5\nAutre,8")).toEqual([
      { Nom: "Acme", Score: "5" },
      { Nom: "Autre", Score: "8" },
    ]);
  });

  it("déséchappe une valeur contenant une virgule ou un guillemet", () => {
    expect(parseCsv('Nom,Score\n"Acme, ""test""",1')).toEqual([{ Nom: 'Acme, "test"', Score: "1" }]);
  });

  it("déséchappe une valeur contenant un saut de ligne", () => {
    expect(parseCsv('Nom,Score\n"Ligne1\nLigne2",1')).toEqual([{ Nom: "Ligne1\nLigne2", Score: "1" }]);
  });

  it("retourne un tableau vide pour un texte vide", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("retourne un tableau vide s'il n'y a que l'en-tête", () => {
    expect(parseCsv("Nom,Score")).toEqual([]);
  });

  it("ignore les lignes entièrement vides", () => {
    expect(parseCsv("Nom,Score\nAcme,5\n\nAutre,8\n")).toEqual([
      { Nom: "Acme", Score: "5" },
      { Nom: "Autre", Score: "8" },
    ]);
  });

  it("gère les fins de ligne CRLF", () => {
    expect(parseCsv("Nom,Score\r\nAcme,5\r\n")).toEqual([{ Nom: "Acme", Score: "5" }]);
  });

  it("fait un aller-retour avec toCsv", () => {
    const rows: Row[] = [{ name: 'Acme, "test"', score: 5 }, { name: "Ligne1\nLigne2", score: 8 }];
    const parsed = parseCsv(toCsv(rows, COLUMNS));
    expect(parsed).toEqual([
      { Nom: 'Acme, "test"', Score: "5" },
      { Nom: "Ligne1\nLigne2", Score: "8" },
    ]);
  });
});
