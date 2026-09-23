import { describe, expect, it } from "vitest";
import type { CustomFieldDefinition } from "@dmh/types";
import { resolveDefinitionsForClient } from "./customFieldScope";

const def = (over: Partial<CustomFieldDefinition>): CustomFieldDefinition => ({
  id: "d",
  client_id: null,
  is_system: true,
  entity_type: "company",
  field_key: "k",
  label: "L",
  field_type: "text",
  select_options: null,
  created_at: "2026-09-23",
  ...over,
});

const system = def({ id: "sys", field_key: "offres_concernees", field_type: "multiselect", select_options: ["Offre 1", "Offre 2"] });
const mine = def({ id: "mine", client_id: "A", is_system: false, field_key: "secteur" });
const other = def({ id: "other", client_id: "B", is_system: false, field_key: "secteur" });

describe("resolveDefinitionsForClient", () => {
  it("système d'abord, puis les champs du client — jamais ceux d'un autre client", () => {
    expect(resolveDefinitionsForClient([mine, other, system], "A").map((d) => d.id)).toEqual(["sys", "mine"]);
  });

  it("applique la surcharge d'options du client, sans muter l'original", () => {
    const resolved = resolveDefinitionsForClient(
      [system],
      "A",
      [
        { field_definition_id: "sys", client_id: "A", select_options: ["Audit énergétique", "Maintenance"] },
        { field_definition_id: "sys", client_id: "B", select_options: ["Autre offre"] },
      ],
    );
    expect(resolved[0].select_options).toEqual(["Audit énergétique", "Maintenance"]);
    expect(system.select_options).toEqual(["Offre 1", "Offre 2"]);
  });

  it("sans surcharge, garde les options par défaut du champ système", () => {
    expect(resolveDefinitionsForClient([system], "B")[0].select_options).toEqual(["Offre 1", "Offre 2"]);
  });
});
