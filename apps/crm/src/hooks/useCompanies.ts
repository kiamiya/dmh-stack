import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listAllCompanies } from "../services/companies";
import type { CompanyListRow } from "../services/companies";

export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listAllCompanies(supabase)
      .then(setCompanies)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { companies, loading, error, reload: load };
}
