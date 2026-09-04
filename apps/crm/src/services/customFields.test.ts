import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFieldDefinition, listFieldDefinitions, listValuesByEntityForClient, listValuesForEntity, upsertValue } from "./customFields";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    upsert: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listFieldDefinitions", () => {
  it("retourne les définitions telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "field-1", field_key: "secteur", label: "Secteur" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listFieldDefinitions(client, "contact")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listFieldDefinitions(client, "contact")).resolves.toEqual([]);
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "boom" } });
    await expect(listFieldDefinitions(client, "contact")).rejects.toThrow("boom");
  });
});

describe("createFieldDefinition", () => {
  it("retourne l'id de la définition créée", async () => {
    const client = makeStubClient({ data: { id: "field-42" }, error: null });
    await expect(
      createFieldDefinition(client, {
        clientId: "client-1",
        entityType: "contact",
        fieldKey: "secteur",
        label: "Secteur",
        fieldType: "text",
      }),
    ).resolves.toEqual({ id: "field-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createFieldDefinition(client, {
        clientId: "client-1",
        entityType: "contact",
        fieldKey: "secteur",
        label: "Secteur",
        fieldType: "text",
      }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("listValuesForEntity", () => {
  it("retourne les valeurs telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "value-1", field_definition_id: "field-1", value: "Industrie" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listValuesForEntity(client, "contact", "contact-1")).resolves.toEqual(rows);
  });
});

describe("listValuesByEntityForClient", () => {
  it("regroupe les valeurs par entity_id -> {field_key: value}", async () => {
    const rows = [
      { entity_id: "c1", value: "Directeur", custom_field_definitions: { field_key: "poste" } },
      { entity_id: "c1", value: ["VIP"], custom_field_definitions: { field_key: "tags" } },
      { entity_id: "c2", value: "Autre", custom_field_definitions: { field_key: "poste" } },
    ];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listValuesByEntityForClient(client, "contact", "client-1")).resolves.toEqual({
      c1: { poste: "Directeur", tags: ["VIP"] },
      c2: { poste: "Autre" },
    });
  });

  it("ignore les lignes sans définition liée", async () => {
    const rows = [{ entity_id: "c1", value: "x", custom_field_definitions: null }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listValuesByEntityForClient(client, "contact", "client-1")).resolves.toEqual({});
  });

  it("retourne un objet vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listValuesByEntityForClient(client, "contact", "client-1")).resolves.toEqual({});
  });
});

describe("upsertValue", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(
      upsertValue(client, {
        clientId: "client-1",
        entityType: "contact",
        entityId: "contact-1",
        fieldDefinitionId: "field-1",
        value: "Industrie",
      }),
    ).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "upsert refusé" } });
    await expect(
      upsertValue(client, {
        clientId: "client-1",
        entityType: "contact",
        entityId: "contact-1",
        fieldDefinitionId: "field-1",
        value: "Industrie",
      }),
    ).rejects.toThrow("upsert refusé");
  });
});
