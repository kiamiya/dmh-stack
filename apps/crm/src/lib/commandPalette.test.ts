import { describe, expect, it } from "vitest";
import { filterPaletteProspects } from "./commandPalette";
import type { ProspectListRow } from "../services/prospects";

function row(id: string, companyName: string): ProspectListRow {
  return {
    id,
    status: "ready",
    client_id: "client-1",
    assigned_to: null,
    last_activity_at: null,
    created_at: "2026-08-01T00:00:00Z",
    companies: { name: companyName, ai_score: 5, naf_label: null },
    contacts: { first_name: "Jean", last_name: "Dupont", email: "jean@example.fr" },
    dmh_clients: { id: "client-1", name: "Cabinet A" },
  };
}

describe("filterPaletteProspects", () => {
  it("retourne les N premiers prospects si la requête est vide", () => {
    const rows = [row("1", "A"), row("2", "B"), row("3", "C")];
    expect(filterPaletteProspects(rows, "", 2)).toHaveLength(2);
  });

  it("filtre par nom d'entreprise", () => {
    const rows = [row("1", "Acme"), row("2", "Autre Corp")];
    const result = filterPaletteProspects(rows, "acme");
    expect(result.map((r) => r.id)).toEqual(["1"]);
  });

  it("limite le nombre de résultats", () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(String(i), "Entreprise"));
    expect(filterPaletteProspects(rows, "entreprise", 5)).toHaveLength(5);
  });

  it("retourne un tableau vide si rien ne correspond", () => {
    const rows = [row("1", "Acme")];
    expect(filterPaletteProspects(rows, "introuvable")).toHaveLength(0);
  });
});
