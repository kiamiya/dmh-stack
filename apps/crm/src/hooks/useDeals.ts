import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listDeals } from "../services/deals";
import type { DealRow } from "../services/deals";

export function useDeals() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return listDeals(supabase)
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { deals, loading, reload: load };
}
