import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeContacts } from "./mergeContacts";

function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  return {
    rpc: () => Promise.resolve(result),
  } as unknown as SupabaseClient;
}

describe("mergeContacts", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(mergeContacts(client, "contact-keep", "contact-remove")).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "cannot merge contacts belonging to different clients" } });
    await expect(mergeContacts(client, "contact-keep", "contact-remove")).rejects.toThrow(
      "cannot merge contacts belonging to different clients",
    );
  });
});
