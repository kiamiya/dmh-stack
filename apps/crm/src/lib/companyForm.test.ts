import { describe, expect, it } from "vitest";
import { validateCompanyForm } from "./companyForm";

describe("validateCompanyForm", () => {
  it("accepte un formulaire valide (site web omis)", () => {
    expect(validateCompanyForm({ clientId: "client-1", name: "ACME SAS", website: "" })).toBeNull();
  });

  it("accepte un site web http(s) valide", () => {
    expect(
      validateCompanyForm({ clientId: "client-1", name: "ACME SAS", website: "https://acme.fr" }),
    ).toBeNull();
  });

  it("refuse un client manquant", () => {
    expect(validateCompanyForm({ clientId: "", name: "ACME SAS", website: "" })).toMatch(/client DMH/);
  });

  it("refuse un nom vide ou blanc", () => {
    expect(validateCompanyForm({ clientId: "client-1", name: "  ", website: "" })).toMatch(/nom/i);
  });

  it("refuse un site web sans http(s)://", () => {
    expect(validateCompanyForm({ clientId: "client-1", name: "ACME SAS", website: "acme.fr" })).toMatch(
      /site web/,
    );
  });
});
