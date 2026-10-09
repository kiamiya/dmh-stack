import { describe, expect, it } from "vitest";
import { autoResizeEmbedCode, defaultFormFields, iframeEmbedCode, normalizeFormFields } from "./config.js";

describe("normalizeFormFields", () => {
  it("formulaire par défaut : inchangé", () => {
    expect(normalizeFormFields(defaultFormFields())).toEqual(defaultFormFields());
  });

  it("écarte doublons, champs inconnus, libellés vides ; e-mail toujours obligatoire", () => {
    expect(
      normalizeFormFields([
        { id: "e", kind: "standard", key: "email", label: "Mail", required: false },
        { id: "e", kind: "standard", key: "phone", label: "Doublon d'id" },
        { id: "p1", kind: "standard", key: "phone", label: "Tél" },
        { id: "p2", kind: "standard", key: "phone", label: "Tél bis" },
        { id: "x", kind: "standard", key: "fax", label: "Fax" },
        { id: "c1", kind: "custom", fieldDefinitionId: "def-1", label: "Secteur", required: true },
        { id: "c2", kind: "custom", fieldDefinitionId: "def-1", label: "Secteur bis" },
        { id: "c3", kind: "custom", fieldDefinitionId: "", label: "Sans définition" },
        { id: "n", kind: "standard", key: "first_name", label: " " },
      ]),
    ).toEqual([
      { id: "e", kind: "standard", key: "email", label: "Mail", required: true },
      { id: "p1", kind: "standard", key: "phone", label: "Tél", required: false },
      { id: "c1", kind: "custom", fieldDefinitionId: "def-1", label: "Secteur", required: true },
    ]);
  });

  it("ajoute l'e-mail en tête s'il manque", () => {
    expect(normalizeFormFields([{ id: "n", kind: "standard", key: "first_name", label: "Prénom" }])).toEqual([
      { id: "email", kind: "standard", key: "email", label: "E-mail", required: true },
      { id: "n", kind: "standard", key: "first_name", label: "Prénom", required: false },
    ]);
    expect(normalizeFormFields("corrompu")).toEqual([{ id: "email", kind: "standard", key: "email", label: "E-mail", required: true }]);
  });
});

describe("codes d'intégration", () => {
  it("iframe", () => {
    expect(iframeEmbedCode("https://crm.dmh.fr/f/contact", 'Nous "écrire"')).toBe(
      '<iframe src="https://crm.dmh.fr/f/contact?embed=1" title="Nous &quot;écrire&quot;" style="width:100%;border:0;min-height:480px" loading="lazy"></iframe>',
    );
  });

  it("capsule HTML : iframe identifiée + écoute de la hauteur limitée à l'origine du CRM", () => {
    const code = autoResizeEmbedCode("https://crm.dmh.fr/f/contact", "Contact", "contact");
    expect(code).toContain('<iframe id="dmh-form-contact" src="https://crm.dmh.fr/f/contact?embed=1"');
    expect(code).toContain('e.origin !== "https://crm.dmh.fr"');
    expect(code).toContain('e.data.slug !== "contact"');
  });
});
