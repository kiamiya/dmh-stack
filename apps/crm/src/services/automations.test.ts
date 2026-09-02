import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addAction, addCondition, createRule, deleteRule, listActions, listConditions, listRules, updateRuleEnabled } from "./automations";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ces services — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listRules", () => {
  it("retourne les règles telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "rule-1", name: "Règle test", enabled: true }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listRules(client, "client-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listRules(client, "client-1")).resolves.toEqual([]);
  });
});

describe("createRule", () => {
  it("retourne l'id de la règle créée", async () => {
    const client = makeStubClient({ data: { id: "rule-42" }, error: null });
    await expect(
      createRule(client, { clientId: "client-1", name: "Règle test", entityType: "opportunity", triggerType: "stage_changed" }),
    ).resolves.toEqual({ id: "rule-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createRule(client, { clientId: "client-1", name: "Règle test", entityType: "opportunity", triggerType: "stage_changed" }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("updateRuleEnabled", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateRuleEnabled(client, "rule-1", false)).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateRuleEnabled(client, "rule-1", false)).rejects.toThrow("update refusé");
  });
});

describe("deleteRule", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(deleteRule(client, "rule-1")).resolves.toBeUndefined();
  });
});

describe("listConditions / addCondition", () => {
  it("liste les conditions telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "cond-1", field: "deal_value", operator: "gt", value: 1000 }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listConditions(client, "rule-1")).resolves.toEqual(rows);
  });

  it("ajoute une condition et retourne son id", async () => {
    const client = makeStubClient({ data: { id: "cond-42" }, error: null });
    await expect(
      addCondition(client, { clientId: "client-1", ruleId: "rule-1", field: "deal_value", operator: "gt", value: 1000 }),
    ).resolves.toEqual({ id: "cond-42" });
  });
});

describe("listActions / addAction", () => {
  it("liste les actions telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "action-1", action_type: "create_task", position: 1 }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listActions(client, "rule-1")).resolves.toEqual(rows);
  });

  it("ajoute une action et retourne son id", async () => {
    const client = makeStubClient({ data: { id: "action-42" }, error: null });
    await expect(
      addAction(client, { clientId: "client-1", ruleId: "rule-1", position: 1, actionType: "create_task", actionConfig: { title: "Relancer" } }),
    ).resolves.toEqual({ id: "action-42" });
  });
});
