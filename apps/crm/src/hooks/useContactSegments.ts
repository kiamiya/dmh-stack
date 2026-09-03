import { useCallback, useEffect, useState } from "react";
import type { ContactSegment } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createSegment, deleteSegment, listSegments } from "../services/contactSegments";
import type { SegmentInsert } from "../services/contactSegments";

export function useContactSegments(clientId: string) {
  const [segments, setSegments] = useState<ContactSegment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clientId) {
      setSegments([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return listSegments(supabase, clientId)
      .then(setSegments)
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: SegmentInsert): Promise<void> {
    await createSegment(supabase, input);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteSegment(supabase, id);
    await load();
  }

  return { segments, loading, create, remove, reload: load };
}
