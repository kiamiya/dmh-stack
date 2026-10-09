import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { normalizeFormFields } from "@dmh/forms";
import type { Form } from "@dmh/types";
import { supabase } from "../../lib/supabase";
import { listFormSubmissions } from "../../services/forms";
import type { FormSubmissionRow } from "../../services/forms";

function display(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return value === null || value === undefined ? "" : String(value);
}

/** S39-12 — dernières réponses d'un formulaire, avec lien vers la fiche contact. */
export function FormSubmissionsPanel({ form }: { form: Form }) {
  const [rows, setRows] = useState<FormSubmissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFormSubmissions(supabase, form.id)
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, [form.id]);

  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (!rows) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">Aucune réponse pour l'instant.</p>;

  const labelById = new Map(normalizeFormFields(form.fields).map((f) => [f.id, f.label]));
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const data = (r.data && typeof r.data === "object" ? r.data : {}) as Record<string, unknown>;
        return (
          <div key={r.id} className="rounded-md border border-border p-2 text-xs">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</span>
              {r.contact_id && r.contacts ? (
                <Link className="text-primary hover:underline" to={`/contacts/${r.contact_id}`}>
                  {`${r.contacts.first_name} ${r.contacts.last_name}`.trim() || r.contacts.email}
                </Link>
              ) : (
                <span className="text-muted-foreground">Contact non rattaché</span>
              )}
            </div>
            <dl className="grid gap-x-3 sm:grid-cols-[max-content_1fr]">
              {Object.entries(data).map(([id, value]) => (
                <div key={id} className="contents">
                  <dt className="text-muted-foreground">{labelById.get(id) ?? id}</dt>
                  <dd className="whitespace-pre-line text-foreground">{display(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
