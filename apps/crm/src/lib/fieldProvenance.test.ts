import { describe, expect, it } from "vitest";
import { groupFieldProvenance } from "./fieldProvenance";
import type { FieldProvenanceRow } from "../services/fieldProvenance";

function row(overrides: Partial<FieldProvenanceRow> = {}): FieldProvenanceRow {
  return {
    id: "p1",
    entity_type: "contact",
    entity_id: "c1",
    field_name: "email",
    source: "dropcontact",
    value: "a@b.fr",
    confidence: 95,
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

const now = new Date("2026-09-11T00:00:00Z");

describe("groupFieldProvenance", () => {
  it("regroupe par champ", () => {
    const rows = [row({ id: "1", field_name: "email" }), row({ id: "2", field_name: "siren", entity_type: "company" })];
    const groups = groupFieldProvenance(rows, now);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.field).sort()).toEqual(["email", "siren"]);
  });

  it("pas de conflit avec une seule source", () => {
    const rows = [row({ id: "1", source: "dropcontact", value: "a@b.fr" })];
    const groups = groupFieldProvenance(rows, now);
    expect(groups[0]!.hasConflict).toBe(false);
  });

  it("détecte un conflit : 2 sources, valeurs différentes", () => {
    const rows = [
      row({ id: "1", source: "dropcontact", value: "a@b.fr", updated_at: "2026-09-01T00:00:00Z" }),
      row({ id: "2", source: "hunter", value: "a2@b.fr", updated_at: "2026-09-05T00:00:00Z" }),
    ];
    const groups = groupFieldProvenance(rows, now);
    expect(groups[0]!.hasConflict).toBe(true);
    expect(groups[0]!.entries[0]!.source).toBe("hunter"); // le plus récent en premier
  });

  it("pas de conflit si 2 sources ont écrit la même valeur", () => {
    const rows = [
      row({ id: "1", source: "dropcontact", value: "a@b.fr" }),
      row({ id: "2", source: "hunter", value: "a@b.fr" }),
    ];
    expect(groupFieldProvenance(rows, now)[0]!.hasConflict).toBe(false);
  });

  it("calcule l'âge en jours depuis la mise à jour la plus récente", () => {
    const rows = [row({ updated_at: "2026-09-09T00:00:00Z" })];
    expect(groupFieldProvenance(rows, now)[0]!.ageDays).toBe(2);
  });
});
