import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultFormFields } from "@dmh/forms";
import { deleteForm, listFormSubmissions, saveForm } from "./forms";
import type { FormPayload } from "../lib/formEditor";

type Call = { op: string; payload?: unknown; filter?: [string, unknown] };

function stub(error: { code?: string; message: string } | null = null) {
  const calls: Call[] = [];
  const res = { data: [], error };
  const client = {
    from: () => ({
      insert: (payload: unknown) => (calls.push({ op: "insert", payload }), Promise.resolve(res)),
      update: (payload: unknown) => ({ eq: (c: string, v: unknown) => (calls.push({ op: "update", payload, filter: [c, v] }), Promise.resolve(res)) }),
      delete: () => ({ eq: (c: string, v: unknown) => (calls.push({ op: "delete", filter: [c, v] }), Promise.resolve(res)) }),
      select: () => ({
        eq: (c: string, v: unknown) => ({
          order: () => ({ limit: (n: number) => (calls.push({ op: "select", filter: [c, v], payload: n }), Promise.resolve(res)) }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

const payload: FormPayload = {
  name: "Contact",
  slug: "contact",
  title: "Contact",
  description: null,
  fields: defaultFormFields(),
  submit_label: "Envoyer",
  success_message: "Merci",
  redirect_url: null,
  consent_text: null,
  active: true,
};

describe("services/forms", () => {
  it("création puis mise à jour", async () => {
    const { client, calls } = stub();
    await saveForm(client, "c1", payload);
    await saveForm(client, "c1", payload, "f1");
    expect(calls[0]).toMatchObject({ op: "insert", payload: { client_id: "c1", slug: "contact" } });
    expect(calls[1]).toMatchObject({ op: "update", filter: ["id", "f1"] });
  });

  it("lien déjà pris : message lisible", async () => {
    const { client } = stub({ code: "23505", message: "duplicate" });
    await expect(saveForm(client, "c1", payload)).rejects.toThrow("Ce lien est déjà utilisé par un autre formulaire.");
  });

  it("suppression et réponses", async () => {
    const { client, calls } = stub();
    await deleteForm(client, "f1");
    await listFormSubmissions(client, "f1", 10);
    expect(calls).toEqual([
      { op: "delete", filter: ["id", "f1"] },
      { op: "select", filter: ["form_id", "f1"], payload: 10 },
    ]);
  });
});
