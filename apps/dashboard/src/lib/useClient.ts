import { useEffect, useState } from "react";
import type { DmhClient } from "@dmh/types";
import { supabase } from "./supabase";

/**
 * Charge le client DMH de l'utilisateur connecté. Ne filtre par aucun
 * `client_id` explicite — la policy RLS `client_user_access`
 * (supabase/migrations/007_add_client_users.sql) ne laisse déjà voir que
 * la ligne `dmh_clients` correspondant à l'utilisateur connecté.
 */
export function useClient() {
  const [client, setClient] = useState<DmhClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("dmh_clients")
      .select("*")
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else setClient(data as DmhClient);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { client, loading, error };
}
