import { useCallback, useEffect, useState } from "react";
import type { ListFolder } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createFolder, deleteFolder, duplicateFolder, listFolders, updateFolder } from "../services/listFolders";
import type { ListFolderInsert, ListFolderUpdate } from "../services/listFolders";

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

  async function update(id: string, patch: ListFolderUpdate): Promise<void> {
    await updateFolder(supabase, id, patch);
    await load();
  }

  async function duplicate(folder: ListFolder): Promise<void> {
    await duplicateFolder(supabase, folder);
    await load();
  }

  return { folders, loading, create, remove, update, duplicate, reload: load };
}
