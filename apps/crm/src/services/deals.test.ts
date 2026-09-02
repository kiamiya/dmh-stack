import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDeal, listDeals, updateDealStatus } from "./deals";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
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

describe("listDeals", () => {
  it("retourne les opportunités telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "deal-1", company_name: "ACME SAS", status: "negotiation" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listDeals(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listDeals(client)).resolves.toEqual([]);
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "boom" } });
    await expect(listDeals(client)).rejects.toThrow("boom");
  });
});

describe("createDeal", () => {
  it("retourne l'id de l'opportunité créée", async () => {
    const client = makeStubClient({ data: { id: "deal-42" }, error: null });
    await expect(
      createDeal(client, { clientId: "client-1", companyName: "ACME SAS", dealValue: 10000 }),
    ).resolves.toEqual({ id: "deal-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createDeal(client, { clientId: "client-1", companyName: "ACME SAS", dealValue: 10000 }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("updateDealStatus", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateDealStatus(client, "deal-1", "won")).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateDealStatus(client, "deal-1", "won")).rejects.toThrow("update refusé");
  });
});
