import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listProspects } from "../services/prospects";
import type { ProspectListRow } from "../services/prospects";

export function useProspects() {
  const [prospects, setProspects] = useState<ProspectListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listProspects(supabase)
      .then((data) => {
        if (!cancelled) setProspects(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { prospects, loading, error };
}
