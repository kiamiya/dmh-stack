import { useCallback, useEffect, useState } from "react";
import { normalizeQuestions, recapLines, requestFromMeeting } from "@dmh/booking";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";
import { supabase } from "../../lib/supabase";
import { formatSlotDateTime } from "../../lib/bookingSlotsView";
import { decideBookingRequest, listPendingBookingRequests } from "../../services/bookingRequests";
import type { BookingRequestRow } from "../../services/bookingRequests";

/**
 * S39-6 — demandes de RDV prises en ligne, en attente de la décision de
 * l'hôte (modèle « invitation acceptée manuellement », décision Loïc du
 * 09/10). Accepter confirme l'événement dans l'agenda (lien Teams) ;
 * refuser libère le créneau.
 */
export function PendingBookingRequests({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BookingRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    listPendingBookingRequests(supabase, clientId)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [clientId]);

  useEffect(load, [load]);

  async function decide(r: BookingRequestRow, decision: "accept" | "decline") {
    if (decision === "decline" && !window.confirm(`Refuser la demande de ${r.guest_name} ? Le créneau sera libéré.`)) return;
    setBusyId(r.id);
    try {
      const result = await decideBookingRequest(supabase, r.id, decision);
      toast(decision === "accept" ? "Rendez-vous confirmé." : "Demande refusée.", "success");
      // Décision enregistrée mais e-mail non parti (ex. calendrier Microsoft à reconnecter) : on le signale.
      if (result.emailWarning) toast(result.emailWarning, "destructive");
      load();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
        Demandes à valider <Badge variant="blue">{requests.length}</Badge>
      </h3>
      {requests.map((r) => {
        const lines = recapLines(requestFromMeeting(r), normalizeQuestions(r.meeting_types?.questions ?? []));
        const past = new Date(r.starts_at).getTime() < Date.now();
        return (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{formatSlotDateTime(r.starts_at, r.meeting_types?.timezone ?? "Europe/Paris")}</span>
                {r.meeting_types && <Badge>{r.meeting_types.name}</Badge>}
                {past && <Badge>Créneau passé</Badge>}
              </div>
              <dl className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[max-content_1fr]">
                {lines.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="whitespace-pre-line text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busyId === r.id || past} onClick={() => decide(r, "accept")}>
                  Accepter
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busyId === r.id} onClick={() => decide(r, "decline")}>
                  Refuser
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
