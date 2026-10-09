import { describe, expect, it } from "vitest";
import { companyNameFallback, normalizePhoneForCountry, validateSubmission } from "./submission.js";
import type { CustomFieldSpec } from "./submission.js";
import type { FormField } from "./config.js";

describe("normalizePhoneForCountry", () => {
  it("format national → international selon le pays", () => {
    expect(normalizePhoneForCountry("FR", "06 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhoneForCountry("BE", "0470 12 34 56")).toBe("+32470123456");
    expect(normalizePhoneForCountry("GB", "020 7946 0000")).toBe("+442079460000");
  });

  it("numéro déjà international : garde son indicatif", () => {
    expect(normalizePhoneForCountry("FR", "+41 22 123 45 67")).toBe("+41221234567");
    expect(normalizePhoneForCountry("FR", "0041 22 123 45 67")).toBe("+41221234567");
  });

  it("refuse l'inexploitable, et un numéro français de mauvaise longueur", () => {
    expect(normalizePhoneForCountry("FR", "06 12 34")).toBeNull();
    expect(normalizePhoneForCountry("FR", "06 12 34 56 78 9")).toBeNull();
    expect(normalizePhoneForCountry("FR", "abc")).toBeNull();
    expect(normalizePhoneForCountry("XX", "0612345678")).toBeNull();
    expect(normalizePhoneForCountry("FR", "")).toBeNull();
  });
});

const fields: FormField[] = [
  { id: "email", kind: "standard", key: "email", label: "E-mail", required: true },
  { id: "first", kind: "standard", key: "first_name", label: "Prénom", required: true },
  { id: "phone", kind: "standard", key: "phone", label: "Téléphone", required: false },
  { id: "sector", kind: "custom", fieldDefinitionId: "d-sector", label: "Secteur", required: true },
  { id: "size", kind: "custom", fieldDefinitionId: "d-size", label: "Effectif", required: false },
  { id: "tags", kind: "custom", fieldDefinitionId: "d-tags", label: "Intérêts", required: false },
  { id: "nl", kind: "custom", fieldDefinitionId: "d-nl", label: "Newsletter", required: false },
  { id: "gone", kind: "custom", fieldDefinitionId: "d-deleted", label: "Supprimé", required: true },
];
const specs: CustomFieldSpec[] = [
  { id: "d-sector", field_type: "select", select_options: ["BTP", "Industrie"] },
  { id: "d-size", field_type: "number", select_options: null },
  { id: "d-tags", field_type: "multiselect", select_options: ["A", "B"] },
  { id: "d-nl", field_type: "boolean", select_options: null },
];

describe("validateSubmission", () => {
  it("réponse valide : valeurs nettoyées et typées ; champ supprimé ignoré", () => {
    expect(
      validateSubmission(
        fields,
        { email: " Alice@ACME.fr ", first: "Alice", phone: "06 12 34 56 78", phone__country: "FR", sector: "BTP", size: "12,5", tags: ["A", "Z"], nl: true },
        specs,
      ),
    ).toEqual({
      value: {
        standard: { email: "alice@acme.fr", first_name: "Alice", phone: "+33612345678" },
        custom: { "d-sector": "BTP", "d-size": 12.5, "d-tags": ["A"], "d-nl": true },
      },
      errors: {},
    });
  });

  it("erreurs par champ", () => {
    const { value, errors } = validateSubmission(fields, { email: "alice @acme.fr", phone: "123", sector: "Banque", size: "douze" }, specs);
    expect(value).toBeNull();
    expect(errors).toEqual({
      email: "Adresse e-mail invalide (sans espace, ex. prenom.nom@societe.fr).",
      first: "Champ obligatoire.",
      phone: "Numéro invalide pour le pays choisi.",
      sector: "Choix invalide.",
      size: "Nombre attendu.",
    });
  });
});

describe("companyNameFallback", () => {
  it("domaine professionnel ou « Particulier »", () => {
    expect(companyNameFallback("alice@acme.fr")).toBe("acme.fr");
    expect(companyNameFallback("alice@gmail.com")).toBe("Particulier");
  });
});
