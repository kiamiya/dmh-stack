import { useCallback, useEffect, useState } from "react";
import { isValidPageSlug, slugify } from "@dmh/booking";
import type { BookingPage, MeetingType } from "@dmh/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";
import { MeetingTypeDialog } from "./MeetingTypeDialog";
import { PendingBookingRequests } from "./PendingBookingRequests";
import { supabase } from "../../lib/supabase";
import { useSelectedClient } from "../../lib/selectedClient";
import { useClients } from "../../hooks/useClients";
import { useStaffMembers } from "../../hooks/useStaffMembers";
import { emptyMeetingTypeForm, meetingTypeToForm, publicBookingUrl } from "../../lib/meetingTypeForm";
import type { MeetingTypePayload } from "../../lib/meetingTypeForm";
import { deleteMeetingType, getBookingPage, listMeetingTypes, saveBookingPage, saveMeetingType } from "../../services/booking";

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const LABEL = "mb-1 block text-xs font-medium text-muted-foreground";

/**
 * S39-3 — configuration du module de prise de rendez-vous du client choisi
 * dans l'en-tête : sa page de réservation (lien public, hôte) et ses types
 * de RDV.
 */
export function BookingSettings() {
  const { clientId } = useSelectedClient();
  const clients = useClients();
  const staff = useStaffMembers();
  const { toast } = useToast();
  const clientName = clients.find((c) => c.id === clientId)?.name ?? "";

  const [page, setPage] = useState<BookingPage | null>(null);
  const [types, setTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageForm, setPageForm] = useState({ title: "", slug: "", description: "", hostStaffId: "" });
  const [savingPage, setSavingPage] = useState(false);
  const [editing, setEditing] = useState<{ type: MeetingType | null } | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const p = await getBookingPage(supabase, clientId);
      setPage(p);
      setTypes(p ? await listMeetingTypes(supabase, p.id) : []);
      setPageForm({
        title: p?.title ?? "",
        slug: p?.slug ?? "",
        description: p?.description ?? "",
        hostStaffId: p?.host_staff_id ?? "",
      });
    } catch (err) {
      toast(`Chargement impossible : ${(err as Error).message}`, "destructive");
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!clientId) {
    return <p className="text-sm text-muted-foreground">Choisis un client dans l'en-tête pour configurer sa page de réservation.</p>;
  }

  async function handleSavePage() {
    const title = pageForm.title.trim() || clientName;
    const slug = pageForm.slug.trim() || slugify(clientName);
    if (!pageForm.hostStaffId) {
      toast("Choisis l'hôte des rendez-vous.", "destructive");
      return;
    }
    if (!isValidPageSlug(slug)) {
      toast(slug === "gerer" ? "« gerer » est réservé, choisis un autre lien." : "Le lien ne peut contenir que des minuscules, chiffres et tirets.", "destructive");
      return;
    }
    setSavingPage(true);
    try {
      await saveBookingPage(supabase, {
        clientId,
        slug,
        title,
        description: pageForm.description.trim() || null,
        hostStaffId: pageForm.hostStaffId,
      });
      toast("Page de réservation enregistrée.", "success");
      await load();
    } catch (err) {
      toast((err as Error).message, "destructive");
    } finally {
      setSavingPage(false);
    }
  }

  async function handleSaveType(payload: MeetingTypePayload) {
    if (!page) return;
    await saveMeetingType(supabase, page.id, payload, editing?.type?.id);
    setEditing(null);
    toast("Type de RDV enregistré.", "success");
    await load();
  }

  async function handleDeleteType(type: MeetingType) {
    if (!window.confirm(`Supprimer le type « ${type.name} » ? Les RDV déjà pris restent dans le CRM.`)) return;
    try {
      await deleteMeetingType(supabase, type.id);
      await load();
    } catch (err) {
      toast((err as Error).message, "destructive");
    }
  }

  function copy(url: string) {
    void navigator.clipboard?.writeText(url);
    toast("Lien copié.", "success");
  }

  const origin = window.location.origin;

  return (
    <div className="space-y-4">
      {page && <PendingBookingRequests clientId={clientId} />}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-base font-semibold text-foreground">Page de réservation — {clientName}</h3>
            {page && (
              <Button type="button" variant="outline" size="sm" onClick={() => copy(publicBookingUrl(origin, page.slug))}>
                Copier le lien public
              </Button>
            )}
          </div>
          {page && <p className="break-all text-xs text-muted-foreground">{publicBookingUrl(origin, page.slug)}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Titre</label>
              <input className={INPUT} value={pageForm.title} placeholder={clientName} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Lien personnalisé</label>
              <input className={INPUT} value={pageForm.slug} placeholder={slugify(clientName)} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Hôte des rendez-vous</label>
              <select className={INPUT} value={pageForm.hostStaffId} onChange={(e) => setPageForm({ ...pageForm, hostStaffId: e.target.value })}>
                <option value="">Sélectionner…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Texte d'accueil (optionnel)</label>
              <input className={INPUT} value={pageForm.description} onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Les disponibilités tiennent compte de l'agenda connecté de l'hôte (Paramètres › Mon calendrier) ; les e-mails
            (confirmation avec invitation .ics, refus, rappels) partent de sa boîte Outlook. Un calendrier Microsoft connecté
            avant le 09/10/2026 doit être reconnecté une fois pour autoriser l'envoi d'e-mails.
          </p>
          <Button type="button" onClick={handleSavePage} disabled={savingPage || loading}>
            {savingPage ? "…" : page ? "Enregistrer la page" : "Créer la page de réservation"}
          </Button>
        </CardContent>
      </Card>

      {page && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-foreground">Types de rendez-vous</h3>
            <Button type="button" size="sm" onClick={() => setEditing({ type: null })}>
              + Nouveau type
            </Button>
          </div>
          {types.length === 0 && <p className="text-sm text-muted-foreground">Aucun type de RDV pour l'instant.</p>}
          {types.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <Badge>{t.duration_minutes} min</Badge>
                    <Badge variant="blue">{t.video_provider === "teams" ? "Teams" : t.location ?? "Sans visio"}</Badge>
                    {!t.active && <Badge>Masqué</Badge>}
                  </div>
                  <p className="break-all text-xs text-muted-foreground">{publicBookingUrl(origin, page.slug, t.slug)}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => copy(publicBookingUrl(origin, page.slug, t.slug))}>
                    Copier le lien
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ type: t })}>
                    Modifier
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteType(t)}>
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <MeetingTypeDialog
          title={editing.type ? `Modifier « ${editing.type.name} »` : "Nouveau type de rendez-vous"}
          initial={editing.type ? meetingTypeToForm(editing.type) : emptyMeetingTypeForm()}
          onClose={() => setEditing(null)}
          onSave={handleSaveType}
        />
      )}
    </div>
  );
}
