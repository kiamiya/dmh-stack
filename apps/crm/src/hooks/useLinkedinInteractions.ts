import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listLinkedinInteractions } from "../services/interactions";
import type { LinkedinInteractionRow } from "../services/interactions";

export function useLinkedinInteractions() {
  const [interactions, setInteractions] = useState<LinkedinInteractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLinkedinInteractions(supabase)
      .then(setInteractions)
      .catch(() => setInteractions([]))
      .finally(() => setLoading(false));
  }, []);

  return { interactions, loading };
}
