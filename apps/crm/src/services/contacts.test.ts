import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createContact, getContact, listContacts, updateContact } from "./contacts";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    insert: () => query,
    select: () => query,
    order: () => query,
    eq: () => query,
    update: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("createContact", () => {
  it("retourne l'id du contact créé", async () => {
    const client = makeStubClient({ data: { id: "contact-42" }, error: null });
    await expect(
      createContact(client, {
        clientId: "client-1",
        companyId: "company-1",
        firstName: "Alice",
        lastName: "Fictive",
        jobTitle: null,
        email: null,
        linkedinUrl: "https://www.linkedin.com/in/alice-fictive",
      }),
    ).resolves.toEqual({ id: "contact-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createContact(client, {
        clientId: "client-1",
        companyId: "company-1",
        firstName: "Alice",
        lastName: "Fictive",
        jobTitle: null,
        email: null,
        linkedinUrl: null,
      }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("listContacts", () => {
  it("retourne les contacts tels que renvoyés par Supabase", async () => {
    const rows = [{ id: "contact-1", first_name: "Alice", last_name: "Fictive" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listContacts(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listContacts(client)).resolves.toEqual([]);
  });
});

describe("getContact", () => {
  it("retourne le contact trouvé", async () => {
    const row = { id: "contact-1", first_name: "Alice", last_name: "Fictive", companies: null };
    const client = makeStubClient({ data: row, error: null });
    await expect(getContact(client, "contact-1")).resolves.toEqual(row);
  });

  it("lève une erreur si Supabase en renvoie une", async () => {
    const client = makeStubClient({ data: null, error: { message: "introuvable" } });
    await expect(getContact(client, "missing")).rejects.toThrow("introuvable");
  });
});

describe("updateContact", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateContact(client, "contact-1", { jobTitle: "CEO" })).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateContact(client, "contact-1", { jobTitle: "CEO" })).rejects.toThrow("update refusé");
  });
});
