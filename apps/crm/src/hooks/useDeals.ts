import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listDeals } from "../services/deals";
import type { DealRow } from "../services/deals";

export function useDeals() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDeals(supabase)
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  return { deals, loading };
}
