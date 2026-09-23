import { useEffect, useState } from "react";
import type { CustomFieldDefinition } from "@dmh/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { supabase } from "../lib/supabase";
import {
  draftsFromOptions,
  hasOptionChanges,
  summarizeOptionEdits,
  validateOptionDrafts,
} from "../lib/fieldOptionsEdit";
import type { OptionDraft } from "../lib/fieldOptionsEdit";
import { saveFieldDefinitionEdit } from "../services/fieldDefinitionEdit";

export interface EditFieldDefinitionDialogProps {
  definition: CustomFieldDefinition | null;
  /** Client choisi sur la page — requis pour éditer les options d'un champ système. */
  clientId: string | null;
  clientName: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * S38-7 — édition d'un champ existant : libellé (champs personnalisés) et
 * options (listes / choix multiples) — ajouter, renommer, supprimer, réordonner.
 * Les renommages/suppressions sont reportés sur les valeurs déjà saisies.
 */
export function EditFieldDefinitionDialog({ definition, clientId, clientName, onClose, onSaved }: EditFieldDefinitionDialogProps) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [drafts, setDrafts] = useState<OptionDraft[]>([]);
  const [newOption, setNewOption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLabel(definition?.label ?? "");
    setDrafts(draftsFromOptions(definition?.select_options ?? null));
    setNewOption("");
    setError(null);
  }, [definition]);

  if (!definition) return null;
  const def = definition;
  const hasOptions = def.field_type === "select" || def.field_type === "multiselect";
  const systemWithoutClient = def.is_system && !clientId;

  function update(index: number, value: string) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, value } : d)));
  }
  function move(index: number, delta: number) {
    setDrafts((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addOption() {
    if (!newOption.trim()) return;
    setDrafts((prev) => [...prev, { original: null, value: newOption.trim() }]);
    setNewOption("");
  }

  const summary = hasOptions ? summarizeOptionEdits(def.select_options, drafts) : null;
  const removedWithValues = summary?.removed ?? [];

  async function handleSave() {
    if (hasOptions) {
      const validation = validateOptionDrafts(drafts);
      if (validation) {
        setError(validation);
        return;
      }
    }
    if (!def.is_system && !label.trim()) {
      setError("Le libellé est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveFieldDefinitionEdit(supabase, {
        definition: def,
        clientId,
        label: def.is_system ? undefined : label,
        options: summary && hasOptionChanges(summary, def.select_options) ? summary : undefined,
      });
      toast(
        result.valuesUpdated > 0
          ? `Champ mis à jour — ${result.valuesUpdated} fiche(s) ajustée(s).`
          : "Champ mis à jour.",
        "success",
      );
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Modifier le champ "{def.label}"</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-3">
        {def.is_system ? (
          <p className="text-xs text-muted-foreground">
            Champ système : son libellé est commun à tous les clients.{" "}
            {hasOptions &&
              (clientId
                ? `Les options modifiées ici ne s'appliquent qu'au client "${clientName ?? clientId}".`
                : "Choisis d'abord un client sur la page pour modifier ses options.")}
          </p>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="edit-field-label">
              Libellé
            </label>
            <input
              id="edit-field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
        )}

        {hasOptions && !systemWithoutClient && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Options</p>
            <ul className="space-y-1">
              {drafts.map((d, i) => (
                <li key={`${d.original ?? "new"}-${i}`} className="flex items-center gap-1">
                  <input
                    aria-label={`Option ${i + 1}`}
                    value={d.value}
                    onChange={(e) => update(i, e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm"
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === drafts.length - 1}
                    aria-label="Descendre"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Supprimer l'option ${d.value}`}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption();
                  }
                }}
                placeholder="Nouvelle option"
                className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={!newOption.trim()}>
                Ajouter
              </Button>
            </div>
            {removedWithValues.length > 0 && (
              <p className="text-xs text-destructive">
                Option(s) supprimée(s) : {removedWithValues.join(", ")} — elles seront retirées des fiches qui les
                utilisent.
              </p>
            )}
            {summary && Object.keys(summary.renames).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Les fiches utilisant une option renommée seront mises à jour automatiquement.
              </p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || (def.is_system && (!hasOptions || systemWithoutClient))}>
          {saving ? "…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
