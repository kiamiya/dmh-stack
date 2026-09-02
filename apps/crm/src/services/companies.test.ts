import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCompany, getCompany, listAllCompanies, listCompaniesForClient, updateCompany } from "./companies";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ces services — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    update: () => query,
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

describe("listAllCompanies", () => {
  it("retourne les entreprises tous clients confondus", async () => {
    const rows = [{ id: "company-1", name: "ACME SAS", client_id: "client-1" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listAllCompanies(client)).resolves.toEqual(rows);
  });
});

describe("getCompany", () => {
  it("retourne l'entreprise trouvée", async () => {
    const row = { id: "company-1", name: "ACME SAS" };
    const client = makeStubClient({ data: row, error: null });
    await expect(getCompany(client, "company-1")).resolves.toEqual(row);
  });

  it("lève une erreur si Supabase en renvoie une", async () => {
    const client = makeStubClient({ data: null, error: { message: "introuvable" } });
    await expect(getCompany(client, "missing")).rejects.toThrow("introuvable");
  });
});

describe("updateCompany", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateCompany(client, "company-1", { city: "Lyon" })).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateCompany(client, "company-1", { city: "Lyon" })).rejects.toThrow("update refusé");
  });
});
