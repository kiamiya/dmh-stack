import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importCompanies, importContacts } from "./entityImport";
import type { ContactImportPlan } from "../lib/contactImportPlan";
import type { CompanyImportPlan } from "../lib/companyImportPlan";

/** Stub minimal, par table, du sous-ensemble de l'API supabase-js utilisé — pas de réseau. Un compteur par table donne un id unique et prévisible à chaque insertion. */
function makeStubClient() {
  const countByTable: Record<string, number> = {};
  function nextId(table: string) {
    countByTable[table] = (countByTable[table] ?? 0) + 1;
    return `${table}-${countByTable[table]}`;
  }

  return {
    from: (table: string) => {
      const query = {
        insert: () => query,
        select: () => query,
        single: () => Promise.resolve({ data: { id: nextId(table) }, error: null }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("importContacts", () => {
  it("crée une entreprise, un contact et un prospect par ligne planifiée", async () => {
    const client = makeStubClient();
    const plan: ContactImportPlan = {
      toCreate: [
        {
          csvLine: 2,
          data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null },
        },
      ],
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
        },
      ],
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
        { csvLine: 2, data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null } },
        { csvLine: 3, data: { firstName: "Bob", lastName: "Exemple", companyName: "acme", jobTitle: null, email: null, linkedinUrl: null } },
      ],
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
        { csvLine: 2, data: { firstName: "Alice", lastName: "Fictive", companyName: "ACME", jobTitle: null, email: null, linkedinUrl: null } },
      ],
      skipped: [],
    };

    const result = await importContacts(failingClient, "client-1", plan, new Map());
    expect(result.contactsCreated).toBe(0);
    expect(result.errors).toEqual([{ csvLine: 2, error: "insert refusé" }]);
  });
});

describe("importCompanies", () => {
  it("crée une entreprise par ligne planifiée", async () => {
    const client = makeStubClient();
    const plan: CompanyImportPlan = {
      toCreate: [{ csvLine: 2, data: { name: "ACME", city: "Lyon", website: null } }],
      skipped: [],
    };

    const result = await importCompanies(client, "client-1", plan);
    expect(result).toEqual({ companiesCreated: 1, errors: [] });
  });
});
