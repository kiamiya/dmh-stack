import { describe, expect, it } from "vitest";
import {
  buildImportTemplateCsv,
  CONTACT_IMPORT_FIELDS,
  COMPANY_IMPORT_FIELDS,
  describeImportColumns,
  groupImportFields,
} from "./importFields";
import { parseCsv } from "./csv";
import { autoDetectColumn } from "./importColumnMapping";

describe("groupImportFields", () => {
  it("sépare propriétés du contact et de l'entreprise pour un import de contacts", () => {
    const groups = groupImportFields(CONTACT_IMPORT_FIELDS);
    expect(groups.map((g) => g.group)).toEqual(["contact", "company"]);
    expect(groups[1].fields.map((f) => f.key)).toEqual(["companyName"]);
  });

  it("un seul groupe pour un import d'entreprises", () => {
    expect(groupImportFields(COMPANY_IMPORT_FIELDS).map((g) => g.group)).toEqual(["company"]);
  });
});

describe("buildImportTemplateCsv", () => {
  it("produit un CSV relisible avec une ligne d'exemple", () => {
    const rows = parseCsv(buildImportTemplateCsv("contact"));
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).toEqual(CONTACT_IMPORT_FIELDS.map((f) => f.label));
    expect(rows[0]["Email"]).toBe("alice.martin@exemple.fr");
  });

  it("chaque en-tête du modèle est reconnu automatiquement au mapping", () => {
    for (const [entity, fields] of [
      ["contact", CONTACT_IMPORT_FIELDS],
      ["company", COMPANY_IMPORT_FIELDS],
    ] as const) {
      const header = Object.keys(parseCsv(buildImportTemplateCsv(entity))[0]);
      for (const field of fields) {
        expect(autoDetectColumn(header, field.key), `${entity}.${field.key}`).toBe(field.label);
      }
    }
  });
});

describe("describeImportColumns", () => {
  it("indique pour chaque colonne le champ rattaché ou l'absence de correspondance", () => {
    expect(
      describeImportColumns(["Prénom", "Nom", "Secteur"], { firstName: "Prénom", lastName: "Nom", email: "" }, CONTACT_IMPORT_FIELDS),
    ).toEqual([
      { column: "Prénom", status: "mapped", fieldLabel: "Prénom" },
      { column: "Nom", status: "mapped", fieldLabel: "Nom" },
      { column: "Secteur", status: "unmapped" },
    ]);
  });
});
