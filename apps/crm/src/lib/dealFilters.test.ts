import { describe, expect, it } from "vitest";
import { EMPTY_DEAL_FILTERS, filterDeals } from "./dealFilters";
import type { DealRow } from "../services/deals";

function baseDeal(overrides: Partial<DealRow> = {}): DealRow {
  return {
    id: "d1",
    client_id: "c1",
    company_name: "Acme",
    name: null,
    deal_value: 1000,
    status: "negotiation",
    signed_at: null,
    attributed_to_dmh: null,
    commission_amount: null,
    contact_id: null,
    company_id: null,
    pipeline_id: null,
    stage_id: null,
    probability: null,
    expected_close_date: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    contact_list_id: null,
    company_list_id: null,
    assigned_to: null,
    contacts: null,
    companies: null,
    ...overrides,
  };
}

const now = new Date("2026-09-11T12:00:00Z");

describe("filterDeals", () => {
  it("preset 'all' ne filtre rien", () => {
    const deals = [baseDeal({ id: "1" }), baseDeal({ id: "2" })];
    expect(filterDeals(deals, EMPTY_DEAL_FILTERS, null, now)).toHaveLength(2);
  });

  it("preset 'mine' : assignée au staff courant", () => {
    const deals = [baseDeal({ id: "1", assigned_to: "s1" }), baseDeal({ id: "2", assigned_to: "s2" })];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, preset: "mine" }, "s1", now).map((d) => d.id)).toEqual(["1"]);
  });

  it("preset 'large' : montant >= 100k", () => {
    const deals = [baseDeal({ id: "1", deal_value: 150_000 }), baseDeal({ id: "2", deal_value: 50_000 })];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, preset: "large" }, null, now).map((d) => d.id)).toEqual(["1"]);
  });

  it("preset 'followup' : en négociation, sans mouvement depuis 20j (créée il y a longtemps)", () => {
    const deals = [
      baseDeal({ id: "1", status: "negotiation", created_at: "2026-08-01T00:00:00Z" }),
      baseDeal({ id: "2", status: "negotiation", created_at: "2026-09-10T00:00:00Z" }),
      baseDeal({ id: "3", status: "won", created_at: "2026-08-01T00:00:00Z" }),
    ];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, preset: "followup" }, null, now).map((d) => d.id)).toEqual(["1"]);
  });

  it("preset 'won_quarter' : gagnée, signée dans le trimestre courant", () => {
    const deals = [
      baseDeal({ id: "1", status: "won", signed_at: "2026-09-05T00:00:00Z" }),
      baseDeal({ id: "2", status: "won", signed_at: "2026-01-05T00:00:00Z" }),
      baseDeal({ id: "3", status: "negotiation", signed_at: null }),
    ];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, preset: "won_quarter" }, null, now).map((d) => d.id)).toEqual(["1"]);
  });

  it("chip montant >= 100k", () => {
    const deals = [baseDeal({ id: "1", deal_value: 150_000 }), baseDeal({ id: "2", deal_value: 50_000 })];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, amountAbove100k: true }, null, now).map((d) => d.id)).toEqual(["1"]);
  });

  it("chip probabilité >= 60%", () => {
    const deals = [baseDeal({ id: "1", probability: 80 }), baseDeal({ id: "2", probability: 40 }), baseDeal({ id: "3", probability: null })];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, probAbove60: true }, null, now).map((d) => d.id)).toEqual(["1"]);
  });

  it("chip sans mouvement 30j", () => {
    const deals = [
      baseDeal({ id: "1", updated_at: "2026-08-01T00:00:00Z" }),
      baseDeal({ id: "2", updated_at: "2026-09-10T00:00:00Z" }),
    ];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, noMovement30d: true }, null, now).map((d) => d.id)).toEqual(["1"]);
  });

  it("chip ouvertes < 10j", () => {
    const deals = [
      baseDeal({ id: "1", status: "negotiation", created_at: "2026-09-10T00:00:00Z" }),
      baseDeal({ id: "2", status: "negotiation", created_at: "2026-08-01T00:00:00Z" }),
      baseDeal({ id: "3", status: "won", created_at: "2026-09-10T00:00:00Z" }),
    ];
    expect(filterDeals(deals, { ...EMPTY_DEAL_FILTERS, openUnder10d: true }, null, now).map((d) => d.id)).toEqual(["1"]);
  });
});
