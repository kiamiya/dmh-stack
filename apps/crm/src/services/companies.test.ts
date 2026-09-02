import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCompany, listCompaniesForClient } from "./companies";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ces services — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listCompaniesForClient", () => {
  it("retourne les entreprises telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "company-1", name: "ACME SAS" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listCompaniesForClient(client, "client-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listCompaniesForClient(client, "client-1")).resolves.toEqual([]);
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "boom" } });
    await expect(listCompaniesForClient(client, "client-1")).rejects.toThrow("boom");
  });
});

describe("createCompany", () => {
  it("retourne l'id de l'entreprise créée", async () => {
    const client = makeStubClient({ data: { id: "company-42" }, error: null });
    await expect(
      createCompany(client, { clientId: "client-1", name: "ACME SAS", city: null, website: null }),
    ).resolves.toEqual({ id: "company-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createCompany(client, { clientId: "client-1", name: "ACME SAS", city: null, website: null }),
    ).rejects.toThrow("insert refusé");
  });
});
