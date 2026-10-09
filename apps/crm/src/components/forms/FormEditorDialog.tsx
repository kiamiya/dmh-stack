import { useState } from "react";
import { slugify } from "@dmh/booking";
import { STANDARD_FIELDS } from "@dmh/forms";
import type { FormField, StandardFieldKey } from "@dmh/forms";
import type { CustomFieldDefinition } from "@dmh/types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { buildFormPayload, moveField } from "../../lib/formEditor";
import type { FormEditorValues, FormPayload } from "../../lib/formEditor";

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const LABEL = "mb-1 block text-xs font-medium text-muted-foreground";

interface Props {
  title: string;
  initial: FormEditorValues;
  customDefinitions: CustomFieldDefinition[];
  onClose: () => void;
  onSave: (payload: FormPayload) => Promise<void>;
}

/** S39-10 — création / modification d'un formulaire (champs standards contrôlés + champs personnalisés du client). */
export function FormEditorDialog({ title, initial, customDefinitions, onClose, onSave }: Props) {
  const [values, setValues] = useState<FormEditorValues>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toAdd, setToAdd] = useState("");

  function set<K extends keyof FormEditorValues>(key: K, value: FormEditorValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function patchField(index: number, patch: Partial<FormField>) {
    set(
      "fields",
      values.fields.map((f, i) => (i === index ? ({ ...f, ...patch } as FormField) : f)),
    );
  }

  const usedStandard = new Set(values.fields.filter((f) => f.kind === "standard").map((f) => (f as { key: StandardFieldKey }).key));
  const usedCustom = new Set(values.fields.filter((f) => f.kind === "custom").map((f) => (f as { fieldDefinitionId: string }).fieldDefinitionId));
  const availableStandard = STANDARD_FIELDS.filter((f) => !usedStandard.has(f.key));
  const availableCustom = customDefinitions.filter((d) => !usedCustom.has(d.id));

  function addField() {
    if (!toAdd) return;
    const [kind, ref] = toAdd.split(":");
    const id = `${ref}-${Date.now().toString(36)}`;
    if (kind === "standard") {
      const std = STANDARD_FIELDS.find((f) => f.key === ref)!;
      set("fields", [...values.fields, { id, kind: "standard", key: std.key, label: std.label, required: false }]);
    } else {
      const def = customDefinitions.find((d) => d.id === ref)!;
      set("fields", [...values.fields, { id, kind: "custom", fieldDefinitionId: def.id, label: def.label, required: false }]);
    }
    setToAdd("");
  }

  async function handleSave() {
    const { payload, errors: next } = buildFormPayload(values, slugify);
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

  function describe(f: FormField): string {
    if (f.kind === "standard") return STANDARD_FIELDS.find((s) => s.key === f.key)?.label ?? f.key;
    const def = customDefinitions.find((d) => d.id === f.fieldDefinitionId);
    return def ? `Champ personnalisé : ${def.label}` : "Champ personnalisé supprimé";
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Nom (interne)</label>
            <input className={INPUT} value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Contact site web" />
          </div>
          <div>
            <label className={LABEL}>Lien personnalisé</label>
            <input className={INPUT} value={values.slug} onChange={(e) => set("slug", e.target.value)} placeholder="déduit du nom si vide" />
          </div>
        </div>
        <div>
          <label className={LABEL}>Titre affiché</label>
          <input className={INPUT} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="identique au nom si vide" />
        </div>
        <div>
          <label className={LABEL}>Texte d'introduction (optionnel)</label>
          <textarea className={INPUT} rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-foreground">Champs</legend>
          <p className="text-xs text-muted-foreground">
            L'e-mail est toujours demandé : il sert à retrouver ou créer la fiche contact. Le téléphone est saisi avec son pays et
            vérifié ; l'e-mail est refusé s'il contient un espace.
          </p>
          {values.fields.map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
              <div className="flex flex-col">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => set("fields", moveField(values.fields, i, -1))} aria-label="Monter">
                  ▲
                </button>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === values.fields.length - 1} onClick={() => set("fields", moveField(values.fields, i, 1))} aria-label="Descendre">
                  ▼
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <input className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={f.label} onChange={(e) => patchField(i, { label: e.target.value })} />
                <span className="text-[11px] text-muted-foreground">{describe(f)}</span>
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={f.required}
                  disabled={f.kind === "standard" && f.key === "email"}
                  onChange={(e) => patchField(i, { required: e.target.checked })}
                />
                Obligatoire
              </label>
              {!(f.kind === "standard" && f.key === "email") && (
                <button type="button" className="px-1 text-xs text-muted-foreground hover:text-destructive" aria-label="Retirer le champ" onClick={() => set("fields", values.fields.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <select className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm" value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
              <option value="">Ajouter un champ…</option>
              {availableStandard.length > 0 && (
                <optgroup label="Champs standards">
                  {availableStandard.map((f) => (
                    <option key={f.key} value={`standard:${f.key}`}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {availableCustom.length > 0 && (
                <optgroup label="Champs personnalisés (fiche contact)">
                  {availableCustom.map((d) => (
                    <option key={d.id} value={`custom:${d.id}`}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <Button type="button" size="sm" variant="outline" onClick={addField} disabled={!toAdd}>
              Ajouter
            </Button>
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Texte du bouton</label>
            <input className={INPUT} value={values.submitLabel} onChange={(e) => set("submitLabel", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Page de remerciement (optionnel)</label>
            <input className={INPUT} value={values.redirectUrl} onChange={(e) => set("redirectUrl", e.target.value)} placeholder="https://www.monsite.fr/merci" />
          </div>
        </div>
        <div>
          <label className={LABEL}>Message de confirmation</label>
          <input className={INPUT} value={values.successMessage} onChange={(e) => set("successMessage", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Mention RGPD (affichée sous le bouton)</label>
          <textarea className={INPUT} rows={2} value={values.consentText} onChange={(e) => set("consentText", e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.active} onChange={(e) => set("active", e.target.checked)} />
          Formulaire en ligne (accepte les réponses)
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
