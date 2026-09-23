import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importCompanies, importContacts } from "./entityImport";
import type { ContactImportPlan } from "../lib/contactImportPlan";
import type { CompanyImportPlan } from "../lib/companyImportPlan";

/** Stub minimal, par table, du sous-ensemble de l'API supabase-js utilisé — pas de réseau. Un compteur par table donne un id unique et prévisible à chaque insertion. */
function makeStubClient(
  upsertCalls?: Array<Record<string, unknown>>,
  insertCalls?: Array<{ table: string; payload: Record<string, unknown> }>,
) {
  const countByTable: Record<string, number> = {};
  function nextId(table: string) {
    countByTable[table] = (countByTable[table] ?? 0) + 1;
    return `${table}-${countByTable[table]}`;
  }

  return {
    from: (table: string) => {
      const query = {
        insert: (payload: Record<string, unknown>) => {
          insertCalls?.push({ table, payload });
          return query;
        },
        select: () => query,
        single: () => Promise.resolve({ data: { id: nextId(table) }, error: null }),
        upsert: (row: Record<string, unknown>) => {
          upsertCalls?.push(row);
          return Promise.resolve({ data: null, error: null });
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("importContacts", () => {
  it("S38-5 : transmet la base juridique RGPD choisie à la création du contact", async () => {
    const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
    const client = makeStubClient(undefined, inserts);
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: {},
        },
      ],
      toUpdate: [],
      skipped: [],
    };
    await importContacts(client, "client-1", plan, new Map(), {}, "legitimate_interest_prospect");
    expect(inserts.find((i) => i.table === "contacts")?.payload.legal_basis).toBe("legitimate_interest_prospect");
  });

  it("crée une entreprise, un contact et un prospect par ligne planifiée", async () => {
    const client = makeStubClient();
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: {},
        },
      ],
      toUpdate: [],
      skipped: [],
    };

    const result = await importContacts(client, "client-1", plan, new Map());

    expect(result).toEqual({
      contactsCreated: 1,
      companiesCreated: 1,
      companiesReused: 0,
      prospectsCreated: 1,
      errors: [],
    });
  });

  it("réutilise une entreprise déjà connue au lieu de la recréer", async () => {
    const client = makeStubClient();
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: {},
        },
      ],
      toUpdate: [],
      skipped: [],
    };

    const result = await importContacts(client, "client-1", plan, new Map([["acme", "existing-company-1"]]));

    expect(result.companiesCreated).toBe(0);
    expect(result.companiesReused).toBe(1);
    expect(result.contactsCreated).toBe(1);
  });

  it("ne recrée l'entreprise qu'une seule fois même si plusieurs lignes la partagent", async () => {
    const client = makeStubClient();
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: {},
        },
        {
          csvLine: 3,
          data: { firstName: "Bob", lastName: "Exemple", companyName: "acme", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: {},
        },
      ],
      toUpdate: [],
      skipped: [],
    };

    const result = await importContacts(client, "client-1", plan, new Map());

    expect(result.companiesCreated).toBe(1);
    expect(result.companiesReused).toBe(1);
    expect(result.contactsCreated).toBe(2);
    expect(result.prospectsCreated).toBe(2);
  });

  it("collecte l'erreur d'une ligne sans interrompre les suivantes", async () => {
    const failingClient = {
      from: (table: string) => {
        if (table === "contacts") {
          return { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "insert refusé" } }) }) }) };
        }
        return {
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: `${table}-1` }, error: null }) }) }),
        };
      },
    } as unknown as SupabaseClient;

    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: {},
        },
      ],
      toUpdate: [],
      skipped: [],
    };

    const result = await importContacts(failingClient, "client-1", plan, new Map());
    expect(result.contactsCreated).toBe(0);
    expect(result.errors).toEqual([{ csvLine: 2, error: "insert refusé" }]);
  });

  it("écrit les valeurs de champs personnalisés résolues pour le contact créé", async () => {
    const upsertCalls: Array<Record<string, unknown>> = [];
    const client = makeStubClient(upsertCalls);
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: { Secteur: "Industrie", "Colonne vide": null },
        },
      ],
      toUpdate: [],
      skipped: [],
    };

    await importContacts(client, "client-1", plan, new Map(), { Secteur: "field-1" });

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]).toMatchObject({
      client_id: "client-1",
      entity_type: "contact",
      field_definition_id: "field-1",
      value: "Industrie",
    });
  });

  it("n'écrit aucune valeur de champ personnalisé sans customFieldColumnMap (comportement inchangé)", async () => {
    const upsertCalls: Array<Record<string, unknown>> = [];
    const client = makeStubClient(upsertCalls);
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
          customFieldValues: { Secteur: "Industrie" },
        },
      ],
      toUpdate: [],
      skipped: [],
    };

    await importContacts(client, "client-1", plan, new Map());

    expect(upsertCalls).toHaveLength(0);
  });
});

describe("importCompanies", () => {
  it("crée une entreprise par ligne planifiée", async () => {
    const client = makeStubClient();
    const plan: CompanyImportPlan = {
      toCreate: [{ csvLine: 2, data: { name: "ACME", city: "Lyon", website: null }, customFieldValues: {} }],
      toUpdate: [],
      skipped: [],
    };

    const result = await importCompanies(client, "client-1", plan);
    expect(result).toEqual({ companiesCreated: 1, errors: [] });
  });

  it("écrit les valeurs de champs personnalisés résolues pour l'entreprise créée", async () => {
    const upsertCalls: Array<Record<string, unknown>> = [];
    const client = makeStubClient(upsertCalls);
    const plan: CompanyImportPlan = {
      toCreate: [
        { csvLine: 2, data: { name: "ACME", city: "Lyon", website: null }, customFieldValues: { Effectif: "50" } },
      ],
      toUpdate: [],
      skipped: [],
    };

    await importCompanies(client, "client-1", plan, { Effectif: "field-2" });

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]).toMatchObject({
      client_id: "client-1",
      entity_type: "company",
      field_definition_id: "field-2",
      value: "50",
    });
  });
});
