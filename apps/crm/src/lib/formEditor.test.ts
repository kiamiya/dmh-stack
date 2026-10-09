import { describe, expect, it } from "vitest";
import { defaultFormFields } from "@dmh/forms";
import { slugify } from "@dmh/booking";
import { DEFAULT_CONSENT_TEXT, buildFormPayload, moveField, publicFormUrl } from "./formEditor";
import type { FormEditorValues } from "./formEditor";

const base: FormEditorValues = {
  name: "Contact site",
  slug: "",
  title: "",
  description: "",
  fields: defaultFormFields(),
  submitLabel: "Envoyer",
  successMessage: "Merci !",
  redirectUrl: "",
  consentText: DEFAULT_CONSENT_TEXT,
  active: true,
};

describe("buildFormPayload", () => {
  it("valide : slug et titre déduits du nom", () => {
    const { payload, errors } = buildFormPayload(base, slugify);
    expect(errors).toEqual([]);
    expect(payload).toMatchObject({ name: "Contact site", slug: "contact-site", title: "Contact site", redirect_url: null, consent_text: DEFAULT_CONSENT_TEXT });
    expect(payload?.fields).toEqual(defaultFormFields());
  });

  it("erreurs", () => {
    const { payload, errors } = buildFormPayload(
      { ...base, name: "", slug: "Mauvais", submitLabel: " ", fields: [{ id: "x", kind: "standard", key: "phone", label: " ", required: false }], redirectUrl: "ftp://x" },
      slugify,
    );
    expect(payload).toBeNull();
    expect(errors).toEqual([
      "Le nom est obligatoire.",
      "Le lien ne peut contenir que des minuscules, chiffres et tirets.",
      "Chaque champ doit avoir un libellé.",
      "Le texte du bouton est obligatoire.",
      "La page de remerciement doit être une adresse https://.",
    ]);
  });
});

describe("moveField", () => {
  it("échange avec le voisin, bornes respectées", () => {
    const f = defaultFormFields();
    expect(moveField(f, 1, -1).map((x) => x.id).slice(0, 2)).toEqual(["first_name", "email"]);
    expect(moveField(f, 0, -1)).toBe(f);
    expect(moveField(f, f.length - 1, 1)).toBe(f);
  });
});

describe("publicFormUrl", () => {
  it("URL publique", () => {
    expect(publicFormUrl("https://crm.dmh.fr/", "contact")).toBe("https://crm.dmh.fr/f/contact");
  });
});
