import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveImportCustomFieldColumnMap } from "./importCustomFieldResolution";
import type { ImportColumnDecision } from "../lib/importColumnDecision";

interface StubDefinition {
  id: string;
  client_id: string;
  entity_type: string;
  field_key: string;
  label: string;
  field_type: string;
  select_options: string[] | null;
  created_at: string;
}

function makeStubClient(options: { existingDefinitions?: StubDefinition[]; failCreate?: boolean } = {}) {
  const existingDefinitions = options.existingDefinitions ?? [];
  const insertCalls: Array<Record<string, unknown>> = [];
  let nextId = 1;

  const client = {
    from: (table: string) => {
      if (table !== "custom_field_definitions") {
        throw new Error(`Table inattendue dans ce stub : ${table}`);
      }
      return {
        insert: (row: Record<string, unknown>) => {
          insertCalls.push(row);
          return {
            select: () => ({
              single: () => {
                if (options.failCreate) {
                  return Promise.resolve({ data: null, error: { message: "conflit d'unicité" } });
                }
                return Promise.resolve({ data: { id: `created-${nextId++}` }, error: null });
              },
            }),
          };
        },
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: existingDefinitions, error: null }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;

  return { client, insertCalls };
}

describe("resolveImportCustomFieldColumnMap", () => {
  it("ne fait aucun appel DB pour des décisions map_existing uniquement", async () => {
    const { client, insertCalls } = makeStubClient();
    const decisions: ImportColumnDecision[] = [
      { column: "Taille", action: "map_existing", fieldDefinitionId: "field-1", fieldKey: "taille" },
      { column: "Colonne inutile", action: "ignore" },
    ];

    const map = await resolveImportCustomFieldColumnMap(client, "client-1", "contact", decisions);

    expect(map).toEqual({ Taille: "field-1" });
    expect(insertCalls).toHaveLength(0);
  });

  it("crée une définition pour une décision create_new et retourne son id", async () => {
    const { client } = makeStubClient();
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    ];

    const map = await resolveImportCustomFieldColumnMap(client, "client-1", "contact", decisions);

    expect(map.Secteur).toBe("created-1");
  });

  it("ne crée qu'une seule fois une définition partagée par plusieurs colonnes (même fieldKey)", async () => {
    const { client, insertCalls } = makeStubClient();
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
      { column: "Secteur (bis)", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    ];

    const map = await resolveImportCustomFieldColumnMap(client, "client-1", "contact", decisions);

    expect(insertCalls).toHaveLength(1);
    expect(map.Secteur).toBe(map["Secteur (bis)"]);
  });

  it("retombe sur listFieldDefinitions si la création échoue sur un conflit d'unicité", async () => {
    const { client } = makeStubClient({
      failCreate: true,
      existingDefinitions: [
        {
          id: "existing-1",
          client_id: "client-1",
          entity_type: "contact",
          field_key: "secteur",
          label: "Secteur",
          field_type: "text",
          select_options: null,
          created_at: "2026-09-17T00:00:00.000Z",
        },
      ],
    });
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    ];

    const map = await resolveImportCustomFieldColumnMap(client, "client-1", "contact", decisions);

    expect(map.Secteur).toBe("existing-1");
  });

  it("propage une erreur claire si la création échoue et qu'aucune définition existante ne correspond", async () => {
    const { client } = makeStubClient({ failCreate: true, existingDefinitions: [] });
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    ];

    await expect(resolveImportCustomFieldColumnMap(client, "client-1", "contact", decisions)).rejects.toThrow(
      /Secteur/,
    );
  });

  it("retourne un objet vide si aucune décision ne concerne un champ personnalisé", async () => {
    const { client, insertCalls } = makeStubClient();
    const map = await resolveImportCustomFieldColumnMap(client, "client-1", "contact", [
      { column: "Colonne", action: "ignore" },
    ]);
    expect(map).toEqual({});
    expect(insertCalls).toHaveLength(0);
  });
});
