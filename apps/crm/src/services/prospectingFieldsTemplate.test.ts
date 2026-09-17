import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyProspectingFieldsTemplate } from "./prospectingFieldsTemplate";
import { PROSPECTING_TEMPLATE_FIELDS } from "../lib/prospectingFieldsTemplate";

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

function makeStubClient(existingDefinitions: StubDefinition[] = []) {
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
              single: () => Promise.resolve({ data: { id: `created-${nextId++}` }, error: null }),
            }),
          };
        },
        select: () => ({
          eq: (_column: string, value: string) => ({
            order: () =>
              Promise.resolve({
                data: existingDefinitions.filter((d) => d.entity_type === value),
                error: null,
              }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;

  return { client, insertCalls };
}

describe("applyProspectingFieldsTemplate", () => {
  it("crée tous les champs du gabarit quand aucun n'existe encore pour ce client", async () => {
    const { client, insertCalls } = makeStubClient();

    const result = await applyProspectingFieldsTemplate(client, "client-1");

    expect(result.created).toHaveLength(PROSPECTING_TEMPLATE_FIELDS.length);
    expect(result.skipped).toEqual([]);
    expect(insertCalls).toHaveLength(PROSPECTING_TEMPLATE_FIELDS.length);
  });

  it("ne recrée pas un champ déjà existant pour ce client (idempotent)", async () => {
    const { client, insertCalls } = makeStubClient([
      {
        id: "existing-1",
        client_id: "client-1",
        entity_type: "company",
        field_key: "niveau_de_chaleur",
        label: "Niveau de chaleur",
        field_type: "select",
        select_options: ["COLD", "WARM", "HOT"],
        created_at: "2026-09-17T00:00:00.000Z",
      },
    ]);

    const result = await applyProspectingFieldsTemplate(client, "client-1");

    expect(result.skipped).toContain("Niveau de chaleur");
    expect(result.created).not.toContain("Niveau de chaleur");
    expect(insertCalls).toHaveLength(PROSPECTING_TEMPLATE_FIELDS.length - 1);
  });

  it("recrée un champ pour un autre client même si le field_key existe déjà ailleurs", async () => {
    const { client } = makeStubClient([
      {
        id: "existing-1",
        client_id: "client-autre",
        entity_type: "company",
        field_key: "niveau_de_chaleur",
        label: "Niveau de chaleur",
        field_type: "select",
        select_options: ["COLD", "WARM", "HOT"],
        created_at: "2026-09-17T00:00:00.000Z",
      },
    ]);

    const result = await applyProspectingFieldsTemplate(client, "client-1");

    expect(result.created).toContain("Niveau de chaleur");
  });

  it("répartit correctement les champs entre contact et company", async () => {
    const { client, insertCalls } = makeStubClient();

    await applyProspectingFieldsTemplate(client, "client-1");

    expect(insertCalls.filter((c) => c.entity_type === "contact")).toHaveLength(1);
    expect(insertCalls.filter((c) => c.entity_type === "company")).toHaveLength(
      PROSPECTING_TEMPLATE_FIELDS.length - 1,
    );
  });
});
