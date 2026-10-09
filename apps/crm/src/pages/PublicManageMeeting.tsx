import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MEETING_STATUS_LABEL } from "@dmh/booking";
import { Button } from "../components/ui/button";
import { calendarOAuthConfig } from "../lib/supabase";
import { formatSlotDateTime, groupSlotsByLocalDay } from "../lib/bookingSlotsView";
import { cancelManagedMeeting, fetchManagedMeeting, rescheduleManagedMeeting } from "../services/publicBooking";
import type { ManagedMeeting } from "../services/publicBooking";

const base = () => calendarOAuthConfig.functionsBaseUrl;

/**
 * S39-8 — page publique « reprogrammer / annuler » (lien de l'e-mail de
 * confirmation, CR du 09/10/2026). Reprogrammer repasse la demande « en
 * attente » : l'hôte la valide à nouveau (modèle d'acceptation manuelle).
 */
export function PublicManageMeetingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ManagedMeeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchManagedMeeting(base(), token!)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
  }, [token]);

  useEffect(load, [load]);

  const timezone = data?.type?.timezone ?? "Europe/Paris";
  const groups = useMemo(() => (data ? groupSlotsByLocalDay(data.slots, timezone) : []), [data, timezone]);

  async function handleCancel() {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    setBusy(true);
    try {
      await cancelManagedMeeting(base(), token!);
      setNotice("Votre rendez-vous est annulé. Une confirmation vous a été envoyée par e-mail.");
      setMode("view");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule(slotStart: string) {
    setBusy(true);
    try {
      await rescheduleManagedMeeting(base(), token!, slotStart);
      setNotice(`Votre demande de déplacement au ${formatSlotDateTime(slotStart, timezone)} a été transmise. Vous recevrez une confirmation par e-mail dès qu'elle aura été acceptée.`);
      setMode("view");
      load();
    } catch (e) {
      setError((e as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        {!data && !error && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="rounded-md border border-border p-3 text-sm text-foreground">{notice}</p>}
        {data && (
          <>
            <header className="space-y-1">
              <h1 className="font-heading text-xl font-semibold text-foreground">{data.type?.name ?? "Votre rendez-vous"}</h1>
              <p className="text-sm text-foreground">
                {formatSlotDateTime(data.meeting.startsAt, timezone)} — <strong>{MEETING_STATUS_LABEL[data.meeting.status]}</strong>
              </p>
              {data.meeting.onlineMeetingUrl && (
                <p className="text-sm">
                  <a className="text-accent hover:underline" href={data.meeting.onlineMeetingUrl}>
                    Rejoindre la réunion Teams
                  </a>
                </p>
              )}
              {data.rights.reason && <p className="text-sm text-muted-foreground">{data.rights.reason}</p>}
            </header>

            {mode === "view" && (data.rights.canCancel || data.rights.canReschedule) && (
              <div className="flex flex-wrap gap-2">
                {data.rights.canReschedule && (
                  <Button type="button" onClick={() => setMode("reschedule")} disabled={busy}>
                    Reprogrammer
                  </Button>
                )}
                {data.rights.canCancel && (
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={busy}>
                    Annuler le rendez-vous
                  </Button>
                )}
              </div>
            )}

            {mode === "reschedule" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-foreground">Choisissez un nouveau créneau</h2>
                  <button type="button" className="text-xs text-accent hover:underline" onClick={() => setMode("view")}>
                    Retour
                  </button>
                </div>
                {groups.length === 0 && <p className="text-sm text-muted-foreground">Aucun autre créneau disponible pour le moment.</p>}
                {groups.map((g) => (
                  <div key={g.dayKey}>
                    <div className="mb-1.5 text-sm font-medium capitalize text-foreground">{g.dateLabel}</div>
                    <div className="flex flex-wrap gap-2">
                      {g.slots.map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          disabled={busy}
                          onClick={() => handleReschedule(s.start)}
                          className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
                        >
                          {s.timeLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Horaires affichés à l'heure de Paris.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
