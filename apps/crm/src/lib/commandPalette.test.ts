import { describe, expect, it } from "vitest";
import { filterPaletteCompanies, filterPaletteContacts, filterPaletteProspects } from "./commandPalette";
import type { ProspectListRow } from "../services/prospects";
import type { ContactListRow } from "../services/contacts";
import type { CompanyListRow } from "../services/companies";

function row(id: string, companyName: string): ProspectListRow {
  return {
    id,
    status: "ready",
    client_id: "client-1",
    assigned_to: null,
    contact_id: null,
    company_id: null,
    last_activity_at: null,
    created_at: "2026-08-01T00:00:00Z",
    companies: { name: companyName, ai_score: 5, naf_label: null },
    contacts: {
      first_name: "Jean",
      last_name: "Dupont",
      job_title: null,
      email: "jean@example.fr",
      phone: null,
      linkedin_url: null,
      data_source: null,
      email_confidence: null,
      updated_at: null,
    },
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

function contactRow(id: string, firstName: string, lastName: string, email: string | null): ContactListRow {
  return {
    id,
    first_name: firstName,
    last_name: lastName,
    job_title: null,
    email,
    email_confidence: null,
    linkedin_url: null,
    company_id: "company-1",
    client_id: "client-1",
    data_source: null,
    companies: { name: "Acme" },
  };
}

describe("filterPaletteContacts", () => {
  it("retourne un tableau vide si la requête est vide", () => {
    expect(filterPaletteContacts([contactRow("1", "Jean", "Dupont", null)], "")).toEqual([]);
  });

  it("filtre par prénom, nom ou email", () => {
    const rows = [contactRow("1", "Jean", "Dupont", "jean@acme.fr"), contactRow("2", "Marie", "Martin", null)];
    expect(filterPaletteContacts(rows, "dupont").map((c) => c.id)).toEqual(["1"]);
    expect(filterPaletteContacts(rows, "acme.fr").map((c) => c.id)).toEqual(["1"]);
  });

  it("limite le nombre de résultats", () => {
    const rows = Array.from({ length: 10 }, (_, i) => contactRow(String(i), "Jean", "Dupont", null));
    expect(filterPaletteContacts(rows, "dupont", 3)).toHaveLength(3);
  });
});

function companyRow(id: string, name: string, siren: string | null): CompanyListRow {
  return { id, name, siren, city: null, naf_label: null, employee_range: null, revenue: null, ai_score: null, client_id: "client-1", updated_at: null };
}

describe("filterPaletteCompanies", () => {
  it("retourne un tableau vide si la requête est vide", () => {
    expect(filterPaletteCompanies([companyRow("1", "Acme", null)], "")).toEqual([]);
  });

  it("filtre par nom ou SIREN", () => {
    const rows = [companyRow("1", "Acme", "812449067"), companyRow("2", "Autre Corp", null)];
    expect(filterPaletteCompanies(rows, "acme").map((c) => c.id)).toEqual(["1"]);
    expect(filterPaletteCompanies(rows, "812449067").map((c) => c.id)).toEqual(["1"]);
  });

  it("limite le nombre de résultats", () => {
    const rows = Array.from({ length: 10 }, (_, i) => companyRow(String(i), "Acme", null));
    expect(filterPaletteCompanies(rows, "acme", 3)).toHaveLength(3);
  });
});
