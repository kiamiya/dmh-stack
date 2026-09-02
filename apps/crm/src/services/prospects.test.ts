import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createProspect, getProspect, listProspects, updateProspectStatus } from "./prospects";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ces services — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    update: () => query,
    insert: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listProspects", () => {
  it("retourne les lignes telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "p1", status: "ready", companies: null, contacts: null, dmh_clients: null }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listProspects(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listProspects(client)).resolves.toEqual([]);
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "boom" } });
    await expect(listProspects(client)).rejects.toThrow("boom");
  });
});

describe("getProspect", () => {
  it("retourne le prospect trouvé", async () => {
    const row = { id: "p1", status: "ready", companies: null, contacts: null };
    const client = makeStubClient({ data: row, error: null });
    await expect(getProspect(client, "p1")).resolves.toEqual(row);
  });

  it("lève une erreur si Supabase en renvoie une", async () => {
    const client = makeStubClient({ data: null, error: { message: "introuvable" } });
    await expect(getProspect(client, "missing")).rejects.toThrow("introuvable");
  });
});

describe("updateProspectStatus", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateProspectStatus(client, "p1", "qualified")).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateProspectStatus(client, "p1", "qualified")).rejects.toThrow("update refusé");
  });
});

describe("createProspect", () => {
  it("retourne l'id du prospect créé", async () => {
    const client = makeStubClient({ data: { id: "p42" }, error: null });
    await expect(
      createProspect(client, { clientId: "client-1", contactId: "contact-1", companyId: "company-1" }),
    ).resolves.toEqual({ id: "p42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createProspect(client, { clientId: "client-1", contactId: "contact-1", companyId: "company-1" }),
    ).rejects.toThrow("insert refusé");
  });
});
