import { describe, expect, it } from "vitest";
import { computeListOverviewRows } from "./listsOverview";

const clients = [
  { id: "c1", name: "Client A" },
  { id: "c2", name: "Client B" },
];

const contactLists = [
  { id: "cl-static", client_id: "c1", name: "Décideurs métallurgie", rules: null, created_at: "2026-01-01" },
];

const companyLists = [
  {
    id: "col-dynamic",
    client_id: "c1",
    name: "Entreprises AURA",
    rules: [{ conditions: [{ field: "region", operator: "eq" as const, value: "AURA" }] }],
    created_at: "2026-01-01",
  },
];

const opportunityLists = [
  { id: "ol-static", client_id: "c2", name: "Deals prioritaires", rules: null, created_at: "2026-01-01" },
];

const contacts = [{ id: "p1", client_id: "c1" }];
const companies = [
  { id: "e1", client_id: "c1", region: "AURA" },
  { id: "e2", client_id: "c1", region: "IDF" },
  { id: "e3", client_id: "c2", region: "AURA" },
];
const opportunities = [{ id: "o1", client_id: "c2" }];

describe("computeListOverviewRows", () => {
  it("calcule un effectif réel pour une liste dynamique via matchesRuleGroups", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    const dynamicRow = rows.find((r) => r.id === "col-dynamic");
    expect(dynamicRow).toMatchObject({ mode: "dynamic", memberCount: 1, clientName: "Client A", entityType: "company" });
  });

  it("utilise le comptage précalculé pour une liste statique", () => {
    const staticCounts = new Map([["cl-static", 12]]);
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, staticCounts);
    const staticRow = rows.find((r) => r.id === "cl-static");
    expect(staticRow).toMatchObject({ mode: "static", memberCount: 12, entityType: "contact" });
  });

  it("retourne 0 pour une liste statique sans comptage fourni", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows.find((r) => r.id === "ol-static")).toMatchObject({ memberCount: 0, clientName: "Client B", entityType: "opportunity" });
  });

  it("agrège les 3 types de listes dans un seul tableau", () => {
    const rows = computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, opportunities, new Map());
    expect(rows).toHaveLength(3);
  });
});
