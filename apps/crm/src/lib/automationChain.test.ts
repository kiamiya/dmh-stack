import { describe, expect, it } from "vitest";
import { splitActionsByBranch, summarizeAction, summarizeConditions, summarizeTrigger } from "./automationChain";

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

  it("décrit l'enrichissement avec son fournisseur", () => {
    const result = summarizeAction([{ action_type: "trigger_enrichment", action_config: { provider: "pappers" } }]);
    expect(result).toBe("Enrichir via Pappers");
  });

  it("priorise create_task si les deux types coexistent", () => {
    const result = summarizeAction([
      { action_type: "trigger_enrichment", action_config: { provider: "dropcontact" } },
      { action_type: "create_task", action_config: { title: "Relancer" } },
    ]);
    expect(result).toBe('Créer tâche : "Relancer"');
  });
});

describe("splitActionsByBranch", () => {
  it("répartit les actions par branche", () => {
    const actions = [
      { branch: "always" as const, id: 1 },
      { branch: "if_true" as const, id: 2 },
      { branch: "if_false" as const, id: 3 },
      { branch: "if_true" as const, id: 4 },
    ];
    expect(splitActionsByBranch(actions)).toEqual({
      always: [{ branch: "always", id: 1 }],
      ifTrue: [
        { branch: "if_true", id: 2 },
        { branch: "if_true", id: 4 },
      ],
      ifFalse: [{ branch: "if_false", id: 3 }],
    });
  });

  it("retourne trois tableaux vides sans action", () => {
    expect(splitActionsByBranch([])).toEqual({ always: [], ifTrue: [], ifFalse: [] });
  });
});
