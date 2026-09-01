import { describe, expect, it } from "vitest";
import { EMPTY_PROSPECT_FILTERS, extractDistinctClients, extractDistinctNafLabels, filterProspects } from "./prospectFilters";
import type { ProspectListRow } from "../services/prospects";

function row(overrides: Partial<ProspectListRow> = {}): ProspectListRow {
  return {
    id: "p1",
    status: "ready",
    client_id: "client-1",
    assigned_to: null,
    last_activity_at: null,
    companies: { name: "Acme", ai_score: 5, naf_label: "Mécanique" },
    contacts: { first_name: "Jean", last_name: "Dupont", email: "jean@acme.fr" },
    dmh_clients: { id: "client-1", name: "Cabinet A" },
    ...overrides,
  };
}

describe("filterProspects", () => {
  it("ne filtre rien avec les filtres vides", () => {
    const rows = [row(), row({ id: "p2" })];
    expect(filterProspects(rows, EMPTY_PROSPECT_FILTERS)).toHaveLength(2);
  });

  it("filtre par recherche sur l'entreprise", () => {
    const rows = [
      row({ companies: { name: "Acme", ai_score: 5, naf_label: null } }),
      row({
        id: "p2",
        companies: { name: "Autre Corp", ai_score: 5, naf_label: null },
        contacts: { first_name: "Marie", last_name: "Curie", email: "marie@autre-corp.fr" },
      }),
    ];
    const result = filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, search: "acme" });
    expect(result).toHaveLength(1);
    expect(result[0]!.companies?.name).toBe("Acme");
  });

  it("filtre par recherche sur l'email du contact", () => {
    const rows = [row({ contacts: { first_name: "A", last_name: "B", email: "unique@example.com" } })];
    expect(filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, search: "unique@example" })).toHaveLength(1);
    expect(filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, search: "introuvable" })).toHaveLength(0);
  });

  it("filtre par statut (multi-select)", () => {
    const rows = [row({ status: "ready" }), row({ id: "p2", status: "won" })];
    const result = filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, statuses: ["won"] });
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("won");
  });

  it("filtre par plage de score IA", () => {
    const rows = [
      row({ id: "p1", companies: { name: "A", ai_score: 2, naf_label: null } }),
      row({ id: "p2", companies: { name: "B", ai_score: 5, naf_label: null } }),
      row({ id: "p3", companies: { name: "C", ai_score: 9, naf_label: null } }),
    ];
    const result = filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, scoreMin: 4, scoreMax: 8 });
    expect(result.map((r) => r.id)).toEqual(["p2"]);
  });

  it("exclut les scores nuls quand une plage est demandée", () => {
    const rows = [row({ companies: { name: "A", ai_score: null, naf_label: null } })];
    expect(filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, scoreMin: 1 })).toHaveLength(0);
  });

  it("filtre par secteur NAF exact", () => {
    const rows = [
      row({ id: "p1", companies: { name: "A", ai_score: 5, naf_label: "Mécanique" } }),
      row({ id: "p2", companies: { name: "B", ai_score: 5, naf_label: "Chimie" } }),
    ];
    const result = filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, nafLabel: "Chimie" });
    expect(result.map((r) => r.id)).toEqual(["p2"]);
  });

  it("filtre par client DMH", () => {
    const rows = [row({ id: "p1", client_id: "client-1" }), row({ id: "p2", client_id: "client-2" })];
    const result = filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, clientId: "client-2" });
    expect(result.map((r) => r.id)).toEqual(["p2"]);
  });

  it("combine plusieurs critères (ET logique)", () => {
    const rows = [
      row({ id: "p1", status: "ready", companies: { name: "Acme", ai_score: 8, naf_label: null } }),
      row({ id: "p2", status: "won", companies: { name: "Acme", ai_score: 8, naf_label: null } }),
    ];
    const result = filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, search: "acme", statuses: ["won"] });
    expect(result.map((r) => r.id)).toEqual(["p2"]);
  });
});

describe("extractDistinctNafLabels", () => {
  it("retourne les secteurs distincts triés, sans null", () => {
    const rows = [
      row({ companies: { name: "A", ai_score: 5, naf_label: "Mécanique" } }),
      row({ companies: { name: "B", ai_score: 5, naf_label: "Chimie" } }),
      row({ companies: { name: "C", ai_score: 5, naf_label: "Mécanique" } }),
      row({ companies: { name: "D", ai_score: 5, naf_label: null } }),
    ];
    expect(extractDistinctNafLabels(rows)).toEqual(["Chimie", "Mécanique"]);
  });
});

describe("extractDistinctClients", () => {
  it("retourne les clients distincts triés par nom", () => {
    const rows = [
      row({ dmh_clients: { id: "c1", name: "Zeta" } }),
      row({ dmh_clients: { id: "c2", name: "Alpha" } }),
      row({ dmh_clients: { id: "c1", name: "Zeta" } }),
    ];
    expect(extractDistinctClients(rows)).toEqual([
      { id: "c2", name: "Alpha" },
      { id: "c1", name: "Zeta" },
    ]);
  });
});
