import { useCallback, useEffect, useState } from "react";
import type { AutomationRule } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { deleteRule, listRules, updateRuleEnabled } from "../services/automations";
import type { RuleInsert } from "../services/automations";
import { createRule } from "../services/automations";

export function useAutomationRules(clientId: string) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clientId) {
      setRules([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return listRules(supabase, clientId)
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: RuleInsert): Promise<{ id: string }> {
    const result = await createRule(supabase, input);
    await load();
    return result;
  }

  async function toggle(id: string, enabled: boolean): Promise<void> {
    await updateRuleEnabled(supabase, id, enabled);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteRule(supabase, id);
    await load();
  }

  return { rules, loading, create, toggle, remove, reload: load };
}
