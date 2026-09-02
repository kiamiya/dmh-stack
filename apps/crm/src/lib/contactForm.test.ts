import { describe, expect, it } from "vitest";
import { validateContactForm } from "./contactForm";

const base = {
  clientId: "client-1",
  companyId: "company-1",
  firstName: "Alice",
  lastName: "Fictive",
  email: "",
  linkedinUrl: "",
};

describe("validateContactForm", () => {
  it("accepte un formulaire valide (email/linkedin omis)", () => {
    expect(validateContactForm(base)).toBeNull();
  });

  it("accepte un email et une URL LinkedIn valides", () => {
    expect(
      validateContactForm({
        ...base,
        email: "alice@example.com",
        linkedinUrl: "https://www.linkedin.com/in/alice-fictive",
      }),
    ).toBeNull();
  });

  it("refuse un client manquant", () => {
    expect(validateContactForm({ ...base, clientId: "" })).toMatch(/client DMH/);
  });

  it("refuse une entreprise manquante", () => {
    expect(validateContactForm({ ...base, companyId: "" })).toMatch(/entreprise/i);
  });

  it("refuse un prénom vide", () => {
    expect(validateContactForm({ ...base, firstName: "  " })).toMatch(/prénom/i);
  });

  it("refuse un nom vide", () => {
    expect(validateContactForm({ ...base, lastName: "  " })).toMatch(/nom/i);
  });

  it("refuse un email mal formé", () => {
    expect(validateContactForm({ ...base, email: "pas-un-email" })).toMatch(/email/i);
  });

  it("refuse une URL qui n'est pas du domaine linkedin.com", () => {
    expect(validateContactForm({ ...base, linkedinUrl: "https://example.com/alice" })).toMatch(/LinkedIn/);
  });
});
