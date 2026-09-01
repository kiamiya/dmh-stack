import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createNote, listInteractions } from "../services/interactions";
import type { InteractionRow } from "../services/interactions";

export function useInteractions(prospectId: string | undefined, clientId: string | undefined) {
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);

  const load = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      setInteractions(await listInteractions(supabase, prospectId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addNote(content: string): Promise<{ ok: boolean; error?: string }> {
    if (!prospectId || !clientId || !content.trim()) return { ok: false, error: "Note vide" };
    setAddingNote(true);
    try {
      const { data } = await supabase.auth.getSession();
      const note = await createNote(supabase, {
        prospectId,
        clientId,
        content: content.trim(),
        createdBy: data.session?.user.id ?? null,
      });
      setInteractions((prev) => [note, ...prev]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    } finally {
      setAddingNote(false);
    }
  }

  return { interactions, loading, error, addingNote, addNote };
}
