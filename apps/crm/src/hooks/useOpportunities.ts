import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createDeal, listDeals, updateDealStatus } from "../services/deals";
import type { DealInsert, DealRow, DealStatus } from "../services/deals";

export function useOpportunities() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listDeals(supabase)
      .then(setDeals)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: DealInsert): Promise<void> {
    await createDeal(supabase, input);
    await load();
  }

  async function changeStatus(id: string, status: DealStatus): Promise<void> {
    await updateDealStatus(supabase, id, status);
    await load();
  }

  return { deals, loading, error, create, changeStatus, reload: load };
}
