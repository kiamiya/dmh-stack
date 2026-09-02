import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AutomationAction,
  AutomationActionType,
  AutomationCondition,
  AutomationConditionOperator,
  AutomationEntityType,
  AutomationRule,
  AutomationTriggerType,
} from "@dmh/types";

export async function listRules(client: SupabaseClient, clientId: string): Promise<AutomationRule[]> {
  const { data, error } = await client
    .from("automation_rules")
    .select("id, client_id, name, enabled, entity_type, trigger_type, trigger_config, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AutomationRule[];
}

export interface RuleInsert {
  clientId: string;
  name: string;
  entityType: AutomationEntityType;
  triggerType: AutomationTriggerType;
  triggerConfig?: Record<string, unknown>;
}

export async function createRule(client: SupabaseClient, input: RuleInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("automation_rules")
    .insert({
      client_id: input.clientId,
      name: input.name,
      entity_type: input.entityType,
      trigger_type: input.triggerType,
      trigger_config: input.triggerConfig ?? {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function updateRuleEnabled(client: SupabaseClient, id: string, enabled: boolean): Promise<void> {
  const { error } = await client.from("automation_rules").update({ enabled }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRule(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("automation_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listConditions(client: SupabaseClient, ruleId: string): Promise<AutomationCondition[]> {
  const { data, error } = await client
    .from("automation_conditions")
    .select("id, client_id, rule_id, field, operator, value, created_at")
    .eq("rule_id", ruleId);
  if (error) throw new Error(error.message);
  return (data ?? []) as AutomationCondition[];
}

export interface ConditionInsert {
  clientId: string;
  ruleId: string;
  field: string;
  operator: AutomationConditionOperator;
  value: unknown;
}

export async function addCondition(client: SupabaseClient, input: ConditionInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("automation_conditions")
    .insert({ client_id: input.clientId, rule_id: input.ruleId, field: input.field, operator: input.operator, value: input.value })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function listActions(client: SupabaseClient, ruleId: string): Promise<AutomationAction[]> {
  const { data, error } = await client
    .from("automation_actions")
    .select("id, client_id, rule_id, position, action_type, action_config, created_at")
    .eq("rule_id", ruleId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as AutomationAction[];
}

export interface ActionInsert {
  clientId: string;
  ruleId: string;
  position: number;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
}

export async function addAction(client: SupabaseClient, input: ActionInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("automation_actions")
    .insert({
      client_id: input.clientId,
      rule_id: input.ruleId,
      position: input.position,
      action_type: input.actionType,
      action_config: input.actionConfig,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}
