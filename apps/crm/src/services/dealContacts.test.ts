import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDealContactRelation, listContactsForDeal, removeDealContactRelation } from "./dealContacts";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    delete: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listContactsForDeal", () => {
  it("retourne les relations telles que renvoyées par Supabase", async () => {
    const rows = [
      { id: "rel-1", contact_id: "contact-1", is_primary: true, role: "achat", contacts: { id: "contact-1", first_name: "Alice", last_name: "Fictive" } },
    ];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listContactsForDeal(client, "deal-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listContactsForDeal(client, "deal-1")).resolves.toEqual([]);
  });
});

describe("addDealContactRelation", () => {
  it("retourne l'id de la relation créée", async () => {
    const client = makeStubClient({ data: { id: "rel-42" }, error: null });
    await expect(
      addDealContactRelation(client, { clientId: "client-1", dealId: "deal-1", contactId: "contact-1", role: "juridique" }),
    ).resolves.toEqual({ id: "rel-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      addDealContactRelation(client, { clientId: "client-1", dealId: "deal-1", contactId: "contact-1" }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("removeDealContactRelation", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(removeDealContactRelation(client, "rel-1")).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "delete refusé" } });
    await expect(removeDealContactRelation(client, "rel-1")).rejects.toThrow("delete refusé");
  });
});
