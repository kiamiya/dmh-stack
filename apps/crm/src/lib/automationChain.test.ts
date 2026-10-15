import { describe, expect, it } from "vitest";
import {
  ENRICHMENT_PROVIDER_OPTIONS,
  isSystemRule,
  sortRulesSystemFirst,
  splitActionsByBranch,
  summarizeAction,
  summarizeConditions,
  summarizeTrigger,
} from "./automationChain";

describe("summarizeTrigger", () => {
  it("traduit le déclencheur en français", () => {
    expect(summarizeTrigger("record_created")).toBe("À la création");
    expect(summarizeTrigger("stage_changed")).toBe("Au changement d'étape");
    expect(summarizeTrigger("status_changed")).toBe("Au changement de statut");
  });

  it("S38-10 : précise le statut cible du déclencheur 'changement de statut'", () => {
    expect(summarizeTrigger("status_changed", { to_status: "enriched_contact" })).toMatch(/^Quand le statut passe à "/);
    expect(summarizeTrigger("status_changed", { to_status: "inconnu" })).toBe("Au changement de statut");
  });

  it("S38-10 : mentionne le type de la tâche créée", () => {
    expect(summarizeAction([{ action_type: "create_task", action_config: { title: "Appeler", task_type: "call" } }])).toBe(
      'Créer tâche (Appel) : "Appeler"',
    );
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

  it("enchaîne plusieurs enrichissements d'une même branche (règle système Dropcontact + score)", () => {
    const result = summarizeAction([
      { action_type: "trigger_enrichment", action_config: { provider: "dropcontact" } },
      { action_type: "trigger_enrichment", action_config: { provider: "score" } },
    ]);
    expect(result).toBe("Enrichir via Dropcontact + Scorer (IA)");
  });

  it("décrit la génération des messages", () => {
    expect(summarizeAction([{ action_type: "trigger_enrichment", action_config: { provider: "messages" } }])).toBe(
      "Générer les messages",
    );
  });

  it("garde un libellé lisible pour un fournisseur inconnu", () => {
    expect(summarizeAction([{ action_type: "trigger_enrichment", action_config: { provider: "hunter" } }])).toBe(
      "Enrichir via hunter",
    );
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

describe("ENRICHMENT_PROVIDER_OPTIONS", () => {
  it("propose les 4 fournisseurs acceptés par la migration 052, dans l'ordre du pipeline", () => {
    expect(ENRICHMENT_PROVIDER_OPTIONS.map((p) => p.value)).toEqual(["pappers", "dropcontact", "score", "messages"]);
  });
});

describe("isSystemRule / sortRulesSystemFirst", () => {
  const custom = { name: "Relance", system_key: null };
  const step3 = { name: "Pipeline · 3. Génération des messages", system_key: "generate_messages" };
  const step1 = { name: "Pipeline · 1. Enrichissement Pappers", system_key: "enrich_pappers" };

  it("reconnaît une règle du pipeline par défaut", () => {
    expect(isSystemRule(step1)).toBe(true);
    expect(isSystemRule(custom)).toBe(false);
    expect(isSystemRule({})).toBe(false);
  });

  it("place les règles système en tête, dans l'ordre du pipeline, puis les autres dans l'ordre reçu", () => {
    const other = { name: "Autre", system_key: null };
    expect(sortRulesSystemFirst([custom, step3, other, step1])).toEqual([step1, step3, custom, other]);
  });
});
