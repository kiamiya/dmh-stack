import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PHONE_COUNTRIES, validateSubmission } from "@dmh/forms";
import type { RawValue } from "@dmh/forms";
import { Button } from "../components/ui/button";
import { calendarOAuthConfig } from "../lib/supabase";
import { PublicFormError, fetchPublicForm, submitPublicForm, toValidationInput } from "../services/publicForms";
import type { PublicForm, PublicFormField } from "../services/publicForms";

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const base = () => calendarOAuthConfig.functionsBaseUrl;

/**
 * S39-11 — formulaire public (`/f/<slug>`), utilisable seul ou intégré dans
 * un site (`?embed=1` : sans marge de page, hauteur publiée au site parent
 * pour la capsule HTML). Les réponses alimentent la fiche contact (S39-12).
 */
export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get("embed") === "1";
  const rootRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, RawValue>>({});
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicForm(base(), slug!)
      .then((r) => setForm(r.form))
      .catch((e) => setLoadError((e as Error).message));
  }, [slug]);

  // Capsule HTML : publie la hauteur du formulaire au site qui l'intègre.
  useEffect(() => {
    if (!embed || !rootRef.current || window.parent === window) return;
    const post = () => window.parent.postMessage({ type: "dmh-form-height", slug, height: rootRef.current?.scrollHeight ?? 0 }, "*");
    const observer = new ResizeObserver(post);
    observer.observe(rootRef.current);
    post();
    return () => observer.disconnect();
  }, [embed, slug, form, success]);

  function set(id: string, value: RawValue) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { fields, specs } = toValidationInput(form.fields);
    const { errors } = validateSubmission(fields, values, specs);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSending(true);
    setSubmitError(null);
    try {
      const r = await submitPublicForm(base(), slug!, values, website);
      if (r.redirectUrl) {
        try {
          (embed ? window.top! : window).location.href = r.redirectUrl;
          return;
        } catch {
          // Navigation de la page parente refusée par le navigateur : on affiche le message.
        }
      }
      setSuccess(r.successMessage);
    } catch (err) {
      const e2 = err as PublicFormError;
      setFieldErrors(e2.fields ?? {});
      setSubmitError(e2.message);
    } finally {
      setSending(false);
    }
  }

  const wrapper = embed ? "bg-background p-1" : "min-h-screen bg-background";
  const inner = embed ? "space-y-4" : "mx-auto max-w-xl space-y-4 px-4 py-8";

  return (
    <div className={wrapper}>
      <div ref={rootRef} className={inner}>
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {!form && !loadError && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {success && <p className="rounded-md border border-border p-4 text-sm text-foreground">{success}</p>}
        {form && !success && (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <header className="space-y-1">
              <h1 className="font-heading text-xl font-semibold text-foreground">{form.title}</h1>
              {form.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{form.description}</p>}
            </header>
            {form.fields.map((f) => (
              <FieldInput key={f.id} field={f} value={values[f.id]} country={(values[`${f.id}__country`] as string) ?? "FR"} onChange={set} error={fieldErrors[f.id]} />
            ))}
            {/* Champ piège anti-spam : invisible pour un humain. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button type="submit" disabled={sending}>
              {sending ? "Envoi…" : form.submitLabel}
            </Button>
            {form.consentText && <p className="text-xs text-muted-foreground">{form.consentText}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  country,
  onChange,
  error,
}: {
  field: PublicFormField;
  value: RawValue;
  country: string;
  onChange: (id: string, value: RawValue) => void;
  error?: string;
}) {
  const id = `f-${field.id}`;
  const label = (
    <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
      {field.label}
      {field.required && " *"}
    </label>
  );
  const text = typeof value === "string" ? value : "";
  let control: JSX.Element;

  if (field.kind === "standard") {
    if (field.key === "message") {
      control = <textarea id={id} rows={4} className={INPUT} value={text} onChange={(e) => onChange(field.id, e.target.value)} />;
    } else if (field.key === "phone") {
      control = (
        <div className="flex gap-2">
          <select
            aria-label="Pays"
            className="rounded-md border border-border bg-background px-2 py-2 text-sm"
            value={country}
            onChange={(e) => onChange(`${field.id}__country`, e.target.value)}
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>
          <input id={id} type="tel" autoComplete="tel" className={INPUT} value={text} onChange={(e) => onChange(field.id, e.target.value)} />
        </div>
      );
    } else {
      const auto = { email: "email", first_name: "given-name", last_name: "family-name", company: "organization", job_title: "organization-title" }[field.key];
      control = (
        <input
          id={id}
          type={field.key === "email" ? "email" : "text"}
          autoComplete={auto}
          className={INPUT}
          value={text}
          onChange={(e) => onChange(field.id, field.key === "email" ? e.target.value.replace(/\s/g, "") : e.target.value)}
        />
      );
    }
  } else if (field.fieldType === "boolean") {
    return (
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input id={id} type="checkbox" className="mt-0.5" checked={value === true} onChange={(e) => onChange(field.id, e.target.checked)} />
          <span>
            {field.label}
            {field.required && " *"}
          </span>
        </label>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  } else if (field.fieldType === "select") {
    control = (
      <select id={id} className={INPUT} value={text} onChange={(e) => onChange(field.id, e.target.value)}>
        <option value="">Sélectionner…</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (field.fieldType === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    control = (
      <div className="flex flex-wrap gap-3">
        {field.options.map((o) => (
          <label key={o} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={(e) => onChange(field.id, e.target.checked ? [...selected, o] : selected.filter((x) => x !== o))}
            />
            {o}
          </label>
        ))}
      </div>
    );
  } else {
    control = (
      <input
        id={id}
        type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
        className={INPUT}
        value={text}
        onChange={(e) => onChange(field.id, e.target.value)}
      />
    );
  }

  return (
    <div>
      {label}
      {control}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
