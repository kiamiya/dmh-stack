import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { countPendingEnrichments, deleteRule, listRules, updateRuleEnabled } from "../services/automations";
import type { AutomationRuleWithChain, RuleInsert } from "../services/automations";
import { createRule } from "../services/automations";

export function useAutomationRules(clientId: string) {
  const [rules, setRules] = useState<AutomationRuleWithChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingEnrichments, setPendingEnrichments] = useState(0);

  const load = useCallback(() => {
    if (!clientId) {
      setRules([]);
      setPendingEnrichments(0);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    countPendingEnrichments(supabase, clientId)
      .then(setPendingEnrichments)
      .catch(() => setPendingEnrichments(0));
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

  return { rules, loading, pendingEnrichments, create, toggle, remove, reload: load };
}
