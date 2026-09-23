import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFieldDefinition } from "@dmh/types";
import { saveFieldDefinitionEdit } from "./fieldDefinitionEdit";

interface Call {
  table: string;
  op: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
}

/** Stub chaînable : enregistre chaque opération et ses filtres `eq`, renvoie `values` pour les lectures. */
function makeStub(values: Array<{ id: string; value: unknown }> = []) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => {
      const make = (op: string, payload?: unknown) => {
        const call: Call = { table, op, payload, filters: [] };
        calls.push(call);
        const chain: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            call.filters.push([col, val]);
            return chain;
          },
          then: (resolve: (v: unknown) => void) => resolve({ data: op === "select" ? values : null, error: null }),
        };
        return chain;
      };
      return {
        select: () => make("select"),
        update: (payload: unknown) => make("update", payload),
        upsert: (payload: unknown) => make("upsert", payload),
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const base: CustomFieldDefinition = {
  id: "def-1",
  client_id: "client-A",
  is_system: false,
  entity_type: "company",
  field_key: "grille",
  label: "Grille",
  field_type: "multiselect",
  select_options: ["C1", "C2"],
  created_at: "2026-09-23",
};

describe("saveFieldDefinitionEdit", () => {
  it("champ personnalisé : met à jour libellé + options et reporte les renommages sur les valeurs", async () => {
    const { client, calls } = makeStub([
      { id: "v1", value: ["C1", "C2"] },
      { id: "v2", value: ["C2"] },
    ]);
    const r = await saveFieldDefinitionEdit(client, {
      definition: base,
      clientId: null,
      label: "Grille de qualification",
      options: { options: ["Budget", "C2"], renames: { C1: "Budget" }, removed: [] },
    });
    expect(r).toEqual({ valuesUpdated: 1 });
    expect(calls[0]).toEqual({
      table: "custom_field_definitions",
      op: "update",
      payload: { label: "Grille de qualification", select_options: ["Budget", "C2"] },
      filters: [["id", "def-1"]],
    });
    expect(calls.filter((c) => c.op === "update" && c.table === "custom_field_values")).toEqual([
      { table: "custom_field_values", op: "update", payload: { value: ["Budget", "C2"] }, filters: [["id", "v1"]] },
    ]);
  });

  it("champ système : options en surcharge pour le client, libellé jamais modifié, valeurs du client seulement", async () => {
    const system = { ...base, client_id: null, is_system: true };
    const { client, calls } = makeStub([{ id: "v1", value: ["C2"] }]);
    const r = await saveFieldDefinitionEdit(client, {
      definition: system,
      clientId: "client-B",
      label: "Nouveau libellé ignoré",
      options: { options: ["C1"], renames: {}, removed: ["C2"] },
    });
    expect(r.valuesUpdated).toBe(1);
    expect(calls.some((c) => c.table === "custom_field_definitions")).toBe(false);
    expect(calls[0]).toMatchObject({
      table: "custom_field_client_options",
      op: "upsert",
      payload: { field_definition_id: "def-1", client_id: "client-B", select_options: ["C1"] },
    });
    expect(calls.find((c) => c.op === "select")?.filters).toEqual([
      ["field_definition_id", "def-1"],
      ["client_id", "client-B"],
    ]);
  });

  it("champ système sans client choisi : refusé", async () => {
    const { client } = makeStub();
    await expect(
      saveFieldDefinitionEdit(client, {
        definition: { ...base, client_id: null, is_system: true },
        clientId: null,
        options: { options: ["C1"], renames: {}, removed: [] },
      }),
    ).rejects.toThrow("Choisis un client");
  });

  it("n'écrit rien si le libellé est inchangé et qu'il n'y a pas d'options", async () => {
    const { client, calls } = makeStub();
    await saveFieldDefinitionEdit(client, { definition: base, clientId: null, label: "Grille" });
    expect(calls).toEqual([]);
  });
});
