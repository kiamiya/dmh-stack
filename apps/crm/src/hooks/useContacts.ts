import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listContacts } from "../services/contacts";
import type { ContactListRow } from "../services/contacts";

export function useContacts() {
  const [contacts, setContacts] = useState<ContactListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listContacts(supabase)
      .then(setContacts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading, error, reload: load };
}
