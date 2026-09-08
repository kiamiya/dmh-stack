import { useCallback, useEffect, useState } from "react";
import type { ListFolder } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createFolder, deleteFolder, listFolders } from "../services/listFolders";
import type { ListFolderInsert } from "../services/listFolders";

/** Dossiers d'un client (S32-segments Lot C) — même forme que `useContactLists`. */
export function useListFolders(clientId: string) {
  const [folders, setFolders] = useState<ListFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clientId) {
      setFolders([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return listFolders(supabase, clientId)
      .then(setFolders)
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: ListFolderInsert): Promise<void> {
    await createFolder(supabase, input);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteFolder(supabase, id);
    await load();
  }

  return { folders, loading, create, remove, reload: load };
}
