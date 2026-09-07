import { describe, expect, it } from "vitest";
import { computeListOverviewRows } from "./listsOverview";

const clients = [
  { id: "c1", name: "Client A" },
  { id: "c2", name: "Client B" },
];

const LIST_META = { created_by: null, updated_at: "2026-01-01", deleted_at: null };

const contactLists = [
  { id: "cl-static", client_id: "c1", name: "Décideurs métallurgie", rules: null, created_at: "2026-01-01", ...LIST_META },
];

const companyLists = [
  {
    id: "col-dynamic",
    client_id: "c1",
    name: "Entreprises AURA",
    rules: [
      {
        conditions: [
          { field: "region", operator: "eq" as const, value: "AURA" },
          { field: "city", operator: "is_set" as const, value: true },
        ],
      },
    ],
    created_at: "2026-01-01",
    ...LIST_META,
  },
];

const opportunityLists = [
  { id: "ol-static", client_id: "c2", name: "Deals prioritaires", rules: null, created_at: "2026-01-01", ...LIST_META },
];

const contacts = [
  { id: "p1", client_id: "c1", job_title: "DAF", email: "a@b.fr", linkedin_url: null },
];
const companies = [
  { id: "e1", client_id: "c1", region: "AURA", siren: "1", naf_label: "Métallurgie", employee_range: "50-250", revenue: 1_000_000, city: "Lyon" },
  { id: "e2", client_id: "c1", region: "IDF", siren: null, naf_label: null, employee_range: null, revenue: null, city: null },
  { id: "e3", client_id: "c2", region: "AURA", siren: "2", naf_label: null, employee_range: null, revenue: null, city: "Paris" },
];
const opportunities = [{ id: "o1", client_id: "c2" }];

describe("computeListOverviewRows", () => {
  it("calcule un effectif réel pour une liste dynamique via matchesRuleGroups", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    const dynamicRow = rows.find((r) => r.id === "col-dynamic");
    expect(dynamicRow).toMatchObject({ mode: "dynamic", memberCount: 1, clientName: "Client A", entityType: "company" });
  });

  it("utilise les vrais ids de membres pour une liste statique", () => {
    const staticIds = new Map([["cl-static", ["p1", "p2", "p3"]]]);
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, staticIds);
    const staticRow = rows.find((r) => r.id === "cl-static");
    expect(staticRow).toMatchObject({ mode: "static", memberCount: 3, entityType: "contact" });
  });

  it("retourne 0 pour une liste statique sans ids fournis", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "ol-static")).toMatchObject({ memberCount: 0, clientName: "Client B", entityType: "opportunity" });
  });

  it("agrège les 3 types de listes dans un seul tableau", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows).toHaveLength(3);
  });

  it("reporte la date de création réelle de la liste", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "cl-static")?.createdAt).toBe("2026-01-01");
  });

  it("compte le nombre total de critères (tous groupes) pour une liste dynamique", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "col-dynamic")?.criteriaCount).toBe(2);
  });

  it("retourne null pour criteriaCount sur une liste statique", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "cl-static")?.criteriaCount).toBeNull();
  });

  it("calcule un taux d'enrichissement moyen réel pour les membres d'une liste d'entreprises", () => {
    // Seul e1 correspond à la règle (region=AURA ET city renseignée, client c1) et a ses 5 champs Pappers remplis -> 100%.
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "col-dynamic")?.enrichmentRate).toBe(100);
  });

  it("retourne null pour enrichmentRate sur une liste d'opportunités", () => {
    const staticIds = new Map([["ol-static", ["o1"]]]);
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, staticIds);
    expect(rows.find((r) => r.id === "ol-static")?.enrichmentRate).toBeNull();
  });

  it("retourne null pour enrichmentRate quand aucun membre n'est résolu", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "cl-static")?.enrichmentRate).toBeNull();
  });
});
