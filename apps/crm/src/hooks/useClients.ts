import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listClients } from "../services/clients";
import type { ClientRow } from "../services/clients";

export function useClients() {
  const [clients, setClients] = useState<ClientRow[]>([]);

  useEffect(() => {
    listClients(supabase)
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  return clients;
}
