import { useState } from "react";
import { WEEKDAY_LABEL } from "@dmh/booking";
import type { BookingQuestion, BookingQuestionType, WeeklyRange } from "@dmh/booking";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { buildMeetingTypePayload } from "../../lib/meetingTypeForm";
import type { MeetingTypeFormValues, MeetingTypePayload } from "../../lib/meetingTypeForm";

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const LABEL = "mb-1 block text-xs font-medium text-muted-foreground";
// Lundi en premier, dimanche en dernier (usage français).
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0];
const QUESTION_TYPE_LABEL: Record<BookingQuestionType, string> = {
  text: "Texte court",
  textarea: "Texte long",
  select: "Liste de choix",
  checkbox: "Case à cocher",
};

interface Props {
  title: string;
  initial: MeetingTypeFormValues;
  onClose: () => void;
  onSave: (payload: MeetingTypePayload) => Promise<void>;
}

/** S39-3 — création / modification d'un type de RDV (modèle Brevo). */
export function MeetingTypeDialog({ title, initial, onClose, onSave }: Props) {
  const [values, setValues] = useState<MeetingTypeFormValues>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MeetingTypeFormValues>(key: K, value: MeetingTypeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setRanges(next: WeeklyRange[]) {
    set("weeklyAvailability", next);
  }

  function setQuestion(index: number, patch: Partial<BookingQuestion>) {
    set(
      "questions",
      values.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  async function handleSave() {
    const { payload, errors: next } = buildMeetingTypePayload(values);
    setErrors(next);
    if (!payload) return;
    setSaving(true);
    try {
      await onSave(payload);
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setSaving(false);
    }
  }

  const numberInput = (key: "durationMinutes" | "bufferMinutes" | "minNoticeHours" | "maxDaysAhead", label: string) => (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        type="number"
        className={INPUT}
        value={values[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Nom</label>
            <input className={INPUT} value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Découverte 30 min" />
          </div>
          <div>
            <label className={LABEL}>Lien personnalisé</label>
            <input className={INPUT} value={values.slug} onChange={(e) => set("slug", e.target.value)} placeholder="déduit du nom si vide" />
          </div>
        </div>
        <div>
          <label className={LABEL}>Description (affichée au prospect)</label>
          <textarea className={INPUT} rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {numberInput("durationMinutes", "Durée (minutes)")}
          {numberInput("bufferMinutes", "Pause entre deux RDV (minutes)")}
          {numberInput("minNoticeHours", "Délai minimum avant un RDV (heures)")}
          {numberInput("maxDaysAhead", "Réservable jusqu'à (jours)")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Visio</label>
            <select className={INPUT} value={values.videoProvider} onChange={(e) => set("videoProvider", e.target.value as MeetingTypeFormValues["videoProvider"])}>
              <option value="teams">Microsoft Teams</option>
              <option value="none">Pas de visio (lieu ou téléphone)</option>
            </select>
          </div>
          {values.videoProvider === "none" && (
            <div>
              <label className={LABEL}>Lieu</label>
              <input className={INPUT} value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Adresse, ou « par téléphone »" />
            </div>
          )}
        </div>

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-foreground">Plages de disponibilité (heure de Paris)</legend>
          <p className="text-xs text-muted-foreground">
            Les créneaux proposés = ces plages, moins les événements de l'agenda connecté de l'hôte.
          </p>
          {DAYS_ORDER.map((day) => {
            const ranges = values.weeklyAvailability.map((r, i) => ({ r, i })).filter(({ r }) => r.day === day);
            return (
              <div key={day} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-foreground">{WEEKDAY_LABEL[day]}</span>
                {ranges.length === 0 && <span className="text-xs text-muted-foreground">Indisponible</span>}
                {ranges.map(({ r, i }) => (
                  <span key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={r.start}
                      onChange={(e) => setRanges(values.weeklyAvailability.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                    />
                    –
                    <input
                      type="time"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={r.end}
                      onChange={(e) => setRanges(values.weeklyAvailability.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                    />
                    <button
                      type="button"
                      className="px-1 text-xs text-muted-foreground hover:text-destructive"
                      aria-label="Retirer la plage"
                      onClick={() => setRanges(values.weeklyAvailability.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setRanges([...values.weeklyAvailability, { day, start: "09:00", end: "12:00" }])}
                >
                  + plage
                </button>
              </div>
            );
          })}
        </fieldset>

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-foreground">Questions de préqualification</legend>
          <p className="text-xs text-muted-foreground">
            Toujours demandés : prénom, nom, e-mail, téléphone, société, notes. Ajoute ici tes questions spécifiques.
          </p>
          {values.questions.map((q, i) => (
            <div key={q.id} className="space-y-1 rounded-md border border-border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                  value={q.label}
                  placeholder="Libellé de la question"
                  onChange={(e) => setQuestion(i, { label: e.target.value })}
                />
                <select
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as BookingQuestionType;
                    setQuestion(i, { type, options: type === "select" ? q.options ?? [] : undefined });
                  }}
                >
                  {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={q.required} onChange={(e) => setQuestion(i, { required: e.target.checked })} />
                  Obligatoire
                </label>
                <button
                  type="button"
                  className="px-1 text-xs text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la question"
                  onClick={() => set("questions", values.questions.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
              {q.type === "select" && (
                <input
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                  value={(q.options ?? []).join(", ")}
                  placeholder="Choix séparés par des virgules"
                  onChange={(e) => setQuestion(i, { options: e.target.value.split(",").map((o) => o.trimStart()) })}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() =>
              set("questions", [...values.questions, { id: `q${Date.now().toString(36)}`, label: "", type: "text", required: false }])
            }
          >
            + Ajouter une question
          </button>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Rappels (heures avant le RDV, séparées par des virgules)</label>
            <input
              className={INPUT}
              value={values.reminderHours.join(", ")}
              onChange={(e) =>
                set(
                  "reminderHours",
                  e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map(Number),
                )
              }
              placeholder="24, 1"
            />
          </div>
          <div>
            <label className={LABEL}>Page de remerciement (optionnel)</label>
            <input className={INPUT} value={values.redirectUrl} onChange={(e) => set("redirectUrl", e.target.value)} placeholder="https://www.monsite.fr/merci" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.active} onChange={(e) => set("active", e.target.checked)} />
          Proposé sur la page de réservation
        </label>

        {errors.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </DialogContent>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
