import { describe, expect, it } from "vitest";
import { PROSPECTING_TEMPLATE_FIELDS } from "./prospectingFieldsTemplate";

describe("PROSPECTING_TEMPLATE_FIELDS", () => {
  it("n'a pas de fieldKey dupliquée au sein d'un même entityType", () => {
    const seen = new Set<string>();
    for (const field of PROSPECTING_TEMPLATE_FIELDS) {
      const compound = `${field.entityType}:${field.fieldKey}`;
      expect(seen.has(compound)).toBe(false);
      seen.add(compound);
    }
  });

  it("fournit au moins une option pour chaque champ select/multiselect", () => {
    for (const field of PROSPECTING_TEMPLATE_FIELDS) {
      if (field.fieldType === "select" || field.fieldType === "multiselect") {
        expect(field.selectOptions?.length).toBeGreaterThan(0);
      }
    }
  });

  it("n'inclut aucun champ pour le bloc 'Statut du compte' (hors périmètre, bloqué sur William)", () => {
    const labels = PROSPECTING_TEMPLATE_FIELDS.map((f) => f.label.toLowerCase());
    expect(labels.some((l) => l.includes("client dmh"))).toBe(false);
  });

  it("ne couvre que les entités contact et company", () => {
    for (const field of PROSPECTING_TEMPLATE_FIELDS) {
      expect(["contact", "company"]).toContain(field.entityType);
    }
  });
});
