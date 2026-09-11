import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listAllInteractions } from "../services/interactions";
import type { InteractionRow } from "../services/interactions";

export function useAllInteractions() {
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return listAllInteractions(supabase)
      .then(setInteractions)
      .catch(() => setInteractions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { interactions, loading, reload: load };
}
