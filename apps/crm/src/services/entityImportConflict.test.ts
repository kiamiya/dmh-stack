import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateExistingCompanies, updateExistingContacts } from "./entityImport";
import type { ExistingCompanyForImport, ExistingContactForImport } from "./entityImport";

interface Call {
  table: string;
  op: "update" | "upsert";
  payload: Record<string, unknown>;
}

/** Stub : enregistre les update/upsert, renvoie `existingValues` pour les lectures de custom_field_values. */
function makeStub(existingValues: Array<{ field_definition_id: string; value: unknown }> = []) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      const thenable = (data: unknown) => ({ ...query, then: (r: (v: unknown) => void) => r({ data, error: null }) });
      query.select = () => thenable(existingValues);
      query.eq = () => thenable(existingValues);
      query.update = (payload: Record<string, unknown>) => {
        calls.push({ table, op: "update", payload });
        return { eq: () => Promise.resolve({ error: null }) };
      };
      query.upsert = (payload: Record<string, unknown>) => {
        calls.push({ table, op: "upsert", payload });
        return Promise.resolve({ error: null });
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const alice: ExistingContactForImport = {
  id: "c-1",
  email: "alice@acme.test",
  first_name: "Alice",
  last_name: "Fictive",
  job_title: "CEO",
  linkedin_url: null,
  legal_basis: null,
};
const byEmail = new Map([["alice@acme.test", alice]]);
const item = (over: Partial<{ jobTitle: string | null; linkedinUrl: string | null }> = {}, custom: Record<string, string | null> = {}) => ({
  csvLine: 2,
  data: {
    firstName: "Alice",
    lastName: "Fictive",
    companyName: "ACME",
    jobTitle: "CTO",
    email: "Alice@acme.test",
    linkedinUrl: "https://linkedin.com/in/alice",
    ...over,
  },
  customFieldValues: custom,
});

describe("updateExistingContacts", () => {
  it("fill_empty : ne complète que le LinkedIn vide, garde le poste existant", async () => {
    const { client, calls } = makeStub();
    const r = await updateExistingContacts(client, "cl", [item()], byEmail, "fill_empty");
    expect(r).toEqual({ updated: 1, unchanged: 0, errors: [] });
    expect(calls).toEqual([{ table: "contacts", op: "update", payload: { linkedin_url: "https://linkedin.com/in/alice" } }]);
  });

  it("overwrite : remplace aussi le poste", async () => {
    const { client, calls } = makeStub();
    await updateExistingContacts(client, "cl", [item()], byEmail, "overwrite");
    expect(calls[0].payload).toEqual({ job_title: "CTO", linkedin_url: "https://linkedin.com/in/alice" });
  });

  it("compte comme inchangée une ligne identique à l'existant", async () => {
    const { client, calls } = makeStub();
    const r = await updateExistingContacts(client, "cl", [item({ jobTitle: "CEO", linkedinUrl: null })], byEmail, "overwrite");
    expect(r).toEqual({ updated: 0, unchanged: 1, errors: [] });
    expect(calls).toEqual([]);
  });

  it("champs personnalisés : fill_empty n'écrase pas une valeur existante, overwrite si", async () => {
    const map = { Secteur: "def-1" };
    const custom = { Secteur: "BTP" };
    const fill = makeStub([{ field_definition_id: "def-1", value: "Industrie" }]);
    await updateExistingContacts(fill.client, "cl", [item({ jobTitle: "CEO", linkedinUrl: null }, custom)], byEmail, "fill_empty", map);
    expect(fill.calls).toEqual([]);
    const over = makeStub([{ field_definition_id: "def-1", value: "Industrie" }]);
    await updateExistingContacts(over.client, "cl", [item({ jobTitle: "CEO", linkedinUrl: null }, custom)], byEmail, "overwrite", map);
    expect(over.calls).toEqual([
      {
        table: "custom_field_values",
        op: "upsert",
        payload: { client_id: "cl", entity_type: "contact", entity_id: "c-1", field_definition_id: "def-1", value: "BTP" },
      },
    ]);
  });

  it("signale une ligne dont le contact existant est introuvable, sans interrompre les autres", async () => {
    const { client } = makeStub();
    const r = await updateExistingContacts(
      client,
      "cl",
      [{ ...item(), data: { ...item().data, email: "inconnu@acme.test" } }, item()],
      byEmail,
      "overwrite",
    );
    expect(r.updated).toBe(1);
    expect(r.errors).toEqual([{ csvLine: 2, error: "Contact existant introuvable pour cet email" }]);
  });

  it("S38-5 : pose la base juridique sur un contact existant qui n'en a pas", async () => {
    const { client, calls } = makeStub();
    const r = await updateExistingContacts(client, "cl", [item({ jobTitle: "CEO", linkedinUrl: null })], byEmail, "skip", {}, "legitimate_interest_prospect");
    expect(r.updated).toBe(1);
    expect(calls).toEqual([{ table: "contacts", op: "update", payload: { legal_basis: "legitimate_interest_prospect" } }]);
  });

  it("S38-5 : n'écrase jamais une base juridique déjà renseignée", async () => {
    const { client, calls } = makeStub();
    const withBasis = new Map([["alice@acme.test", { ...alice, legal_basis: "consent" as const }]]);
    const r = await updateExistingContacts(client, "cl", [item({ jobTitle: "CEO", linkedinUrl: null })], withBasis, "overwrite", {}, "legitimate_interest_prospect");
    expect(r).toEqual({ updated: 0, unchanged: 1, errors: [] });
    expect(calls).toEqual([]);
  });
});

describe("updateExistingCompanies", () => {
  it("met à jour ville/site selon la politique, jamais le nom", async () => {
    const acme: ExistingCompanyForImport = { id: "co-1", name: "ACME", city: "Lyon", website: null };
    const { client, calls } = makeStub();
    const r = await updateExistingCompanies(
      client,
      "cl",
      [{ csvLine: 2, data: { name: "acme", city: "Paris", website: "https://acme.test" }, customFieldValues: {} }],
      new Map([["acme", acme]]),
      "fill_empty",
    );
    expect(r.updated).toBe(1);
    expect(calls).toEqual([{ table: "companies", op: "update", payload: { website: "https://acme.test" } }]);
  });
});
