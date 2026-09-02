import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createContact } from "./contacts";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    insert: () => query,
    select: () => query,
    single: () => Promise.resolve(result),
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
