import { useCallback, useEffect, useState } from "react";
import type { ProspectStatus } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { getProspect, updateProspectStatus } from "../services/prospects";
import type { ProspectDetailRow } from "../services/prospects";
import { getLatestMessage, markMessageReady } from "../services/messages";
import type { MessageRow } from "../services/messages";

export function useProspectDetail(id: string | undefined) {
  const [prospect, setProspect] = useState<ProspectDetailRow | null>(null);
  const [message, setMessage] = useState<MessageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [prospectData, messageData] = await Promise.all([
        getProspect(supabase, id),
        getLatestMessage(supabase, id),
      ]);
      setProspect(prospectData);
      setMessage(messageData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: ProspectStatus) {
    if (!id) return;
    setSavingStatus(true);
    try {
      await updateProspectStatus(supabase, id, status);
      setProspect((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function markReadyForSmartlead() {
    if (!message) return;
    setMarkingReady(true);
    try {
      const { injected_at } = await markMessageReady(supabase, message.id);
      setMessage((prev) => (prev ? { ...prev, approved: true, injected_at } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMarkingReady(false);
    }
  }

  return { prospect, message, loading, error, savingStatus, markingReady, changeStatus, markReadyForSmartlead };
}
