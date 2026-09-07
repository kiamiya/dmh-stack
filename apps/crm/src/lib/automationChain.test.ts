import { describe, expect, it } from "vitest";
import { summarizeAction, summarizeConditions, summarizeTrigger } from "./automationChain";

describe("summarizeTrigger", () => {
  it("traduit le déclencheur en français", () => {
    expect(summarizeTrigger("record_created")).toBe("À la création");
    expect(summarizeTrigger("stage_changed")).toBe("Au changement d'étape");
  });
});

describe("summarizeConditions", () => {
  it("retourne un message dédié sans condition", () => {
    expect(summarizeConditions([])).toBe("Aucune condition");
  });

  it("combine plusieurs conditions avec ET", () => {
    const result = summarizeConditions([
      { field: "score", operator: "gt", value: 80 },
      { field: "email", operator: "is_set", value: null },
    ]);
    expect(result).toBe("score > 80 ET email est renseigné");
  });
});

describe("summarizeAction", () => {
  it("retourne un message dédié sans action", () => {
    expect(summarizeAction([])).toBe("Aucune action");
  });

  it("décrit la création de tâche avec son titre", () => {
    const result = summarizeAction([{ action_type: "create_task", action_config: { title: "Relancer" } }]);
    expect(result).toBe('Créer tâche : "Relancer"');
  });
});
