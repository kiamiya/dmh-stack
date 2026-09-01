import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

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
