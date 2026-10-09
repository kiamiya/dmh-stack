import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { validateBookingRequest } from "@dmh/booking";
import { Button } from "../components/ui/button";
import { calendarOAuthConfig } from "../lib/supabase";
import { formatSlotDateTime, groupSlotsByLocalDay } from "../lib/bookingSlotsView";
import {
  PublicBookingError,
  fetchPublicBookingPage,
  fetchPublicSlots,
  submitPublicBooking,
} from "../services/publicBooking";
import type { PublicMeetingType } from "../services/publicBooking";

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const base = () => calendarOAuthConfig.functionsBaseUrl;

/**
 * S39-5 — page publique de réservation (modèle Brevo, CR du 09/10/2026),
 * hors authentification : `/rdv/<page>` liste les types de RDV du client,
 * `/rdv/<page>/<type>` propose les créneaux puis le formulaire. La demande
 * part « en attente » : l'hôte l'accepte ou la refuse dans le CRM.
 */
export function PublicMeetingPage() {
  const { page, type } = useParams<{ page: string; type?: string }>();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">{type ? <TypeView page={page!} type={type} /> : <PageView page={page!} />}</div>
    </div>
  );
}

function PageView({ page }: { page: string }) {
  const [state, setState] = useState<{ title: string; description: string | null; types: PublicMeetingType[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicBookingPage(base(), page)
      .then((r) => setState({ ...r.page, types: r.types }))
      .catch((e) => setError((e as Error).message));
  }, [page]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!state) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  return (
    <>
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-semibold text-foreground">{state.title}</h1>
        {state.description && <p className="text-sm text-muted-foreground">{state.description}</p>}
      </header>
      {state.types.length === 0 && <p className="text-sm text-muted-foreground">Aucun rendez-vous n'est proposé pour le moment.</p>}
      <div className="space-y-2">
        {state.types.map((t) => (
          <Link key={t.slug} to={`/rdv/${page}/${t.slug}`} className="block rounded-md border border-border p-4 hover:border-accent">
            <div className="font-medium text-foreground">{t.name}</div>
            <div className="text-xs text-muted-foreground">
              {t.durationMinutes} min · {t.videoProvider === "teams" ? "Visio Microsoft Teams" : t.location ?? "Sans visio"}
            </div>
            {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
          </Link>
        ))}
      </div>
    </>
  );
}

type Status = "loading" | "ready" | "error" | "submitting" | "sent";

function TypeView({ page, type }: { page: string; type: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<PublicMeetingType | null>(null);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [selected, setSelected] = useState<{ start: string; end: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", notes: "", website: "" });
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function load() {
    setStatus("loading");
    fetchPublicSlots(base(), page, type)
      .then((r) => {
        setMeetingType(r.type);
        setSlots(r.slots);
        setStatus("ready");
      })
      .catch((e) => {
        setError((e as Error).message);
        setStatus("error");
      });
  }

  useEffect(load, [page, type]);

  const groups = useMemo(() => (meetingType ? groupSlotsByLocalDay(slots, meetingType.timezone) : []), [slots, meetingType]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected || !meetingType) return;
    const { errors } = validateBookingRequest({ ...form, answers }, meetingType.questions);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setStatus("submitting");
    setError(null);
    try {
      const r = await submitPublicBooking(base(), page, type, { slotStart: selected.start, ...form, answers });
      if (r.redirectUrl) {
        window.location.assign(r.redirectUrl);
        return;
      }
      setStatus("sent");
    } catch (err) {
      const e2 = err as PublicBookingError;
      setFieldErrors(e2.fields ?? {});
      setError(e2.message);
      if (e2.status === 409) {
        setSelected(null);
        load();
        return;
      }
      setStatus("ready");
    }
  }

  if (status === "loading") return <p className="text-sm text-muted-foreground">Chargement des disponibilités…</p>;
  if (status === "error" || !meetingType) return <p className="text-sm text-destructive">{error}</p>;
  if (status === "sent") {
    return (
      <div className="space-y-2 rounded-md border border-border p-6 text-center">
        <h1 className="font-heading text-lg font-semibold text-foreground">Demande envoyée</h1>
        <p className="text-sm text-muted-foreground">
          Votre demande pour le {formatSlotDateTime(selected!.start, meetingType.timezone)} a bien été transmise. Vous recevrez
          une confirmation par e-mail dès qu'elle aura été acceptée.
        </p>
      </div>
    );
  }

  const field = (key: keyof typeof form, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`rdv-${key}`}>
        {label}
      </label>
      <input id={`rdv-${key}`} className={INPUT} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
      {fieldErrors[key] && <p className="mt-1 text-xs text-destructive">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <>
      <header className="space-y-1">
        <Link to={`/rdv/${page}`} className="text-xs text-muted-foreground hover:underline">
          ← Tous les rendez-vous
        </Link>
        <h1 className="font-heading text-xl font-semibold text-foreground">{meetingType.name}</h1>
        <p className="text-sm text-muted-foreground">
          {meetingType.durationMinutes} min · {meetingType.videoProvider === "teams" ? "Visio Microsoft Teams" : meetingType.location ?? "Sans visio"}
        </p>
        {meetingType.description && <p className="text-sm text-muted-foreground">{meetingType.description}</p>}
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!selected && (
        <div className="space-y-4">
          {groups.length === 0 && <p className="text-sm text-muted-foreground">Aucun créneau disponible pour le moment.</p>}
          {groups.map((g) => (
            <div key={g.dayKey}>
              <div className="mb-1.5 text-sm font-medium capitalize text-foreground">{g.dateLabel}</div>
              <div className="flex flex-wrap gap-2">
                {g.slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setError(null);
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
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

      {selected && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-4" noValidate>
          <p className="text-sm text-foreground">
            Créneau choisi : <strong>{formatSlotDateTime(selected.start, meetingType.timezone)}</strong>{" "}
            <button type="button" onClick={() => setSelected(null)} className="text-accent hover:underline">
              (changer)
            </button>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("firstName", "Prénom *", { autoComplete: "given-name" })}
            {field("lastName", "Nom *", { autoComplete: "family-name" })}
            {field("email", "E-mail *", { type: "email", autoComplete: "email" })}
            {field("phone", "Téléphone *", { type: "tel", autoComplete: "tel", placeholder: "06 12 34 56 78" })}
          </div>
          {field("company", "Société *", { autoComplete: "organization" })}
          {meetingType.questions.map((q) => (
            <div key={q.id}>
              {q.type === "checkbox" ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={answers[q.id] === true}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.checked })}
                  />
                  <span>
                    {q.label}
                    {q.required && " *"}
                  </span>
                </label>
              ) : (
                <>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {q.label}
                    {q.required && " *"}
                  </label>
                  {q.type === "select" ? (
                    <select className={INPUT} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                      <option value="">Sélectionner…</option>
                      {(q.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : q.type === "textarea" ? (
                    <textarea className={INPUT} rows={3} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  ) : (
                    <input className={INPUT} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  )}
                </>
              )}
              {fieldErrors[`answers.${q.id}`] && <p className="mt-1 text-xs text-destructive">{fieldErrors[`answers.${q.id}`]}</p>}
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rdv-notes">
              Message (optionnel)
            </label>
            <textarea id="rdv-notes" className={INPUT} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {/* Champ piège anti-spam : invisible pour un humain, rempli par les robots. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <Button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Envoi…" : "Demander ce rendez-vous"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Votre demande sera confirmée par e-mail après validation. Vos coordonnées sont utilisées uniquement pour organiser
            ce rendez-vous.
          </p>
        </form>
      )}
    </>
  );
}
