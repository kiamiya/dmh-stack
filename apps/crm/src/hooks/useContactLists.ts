import { useCallback, useEffect, useState } from "react";
import type { ContactList } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { addContactsToList, createList, deleteList, listContactIdsInList, listLists, removeContactFromList } from "../services/contactLists";
import type { ContactListInsert } from "../services/contactLists";

export function useContactLists(clientId: string) {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clientId) {
      setLists([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return listLists(supabase, clientId)
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: ContactListInsert): Promise<void> {
    await createList(supabase, input);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteList(supabase, id);
    await load();
  }

  async function addContacts(listId: string, contactIds: string[]): Promise<void> {
    await addContactsToList(supabase, clientId, listId, contactIds);
  }

  async function removeContact(listId: string, contactId: string): Promise<void> {
    await removeContactFromList(supabase, listId, contactId);
  }

  function listMemberIds(listId: string): Promise<string[]> {
    return listContactIdsInList(supabase, listId);
  }

  return { lists, loading, create, remove, addContacts, removeContact, listMemberIds, reload: load };
}
