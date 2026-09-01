import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listAllInteractions } from "../services/interactions";
import type { InteractionRow } from "../services/interactions";

export function useAllInteractions() {
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllInteractions(supabase)
      .then(setInteractions)
      .catch(() => setInteractions([]))
      .finally(() => setLoading(false));
  }, []);

  return { interactions, loading };
}
