import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  addFieldsBlock,
  blockLabel,
  LAYOUT_COLUMN_LABEL,
  LAYOUT_COLUMNS,
  moveBlockToColumn,
  moveBlockWithinColumn,
  removeFieldsBlock,
  toggleBlockVisibility,
} from "../lib/companyLayout";
import type { CompanyLayout, LayoutColumn } from "../lib/companyLayout";

export interface CompanyLayoutDialogProps {
  open: boolean;
  clientName: string;
  layout: CompanyLayout;
  isCustom: boolean;
  /** Champs disponibles pour un bloc personnalisé (champs système + champs du client, entreprises). */
  fieldOptions: Array<{ key: string; label: string }>;
  onClose: () => void;
  onSave: (layout: CompanyLayout) => Promise<void>;
  onReset: () => Promise<void>;
}

/**
 * S38-9 — personnalisation de la fiche entreprise pour UN client DMH :
 * visibilité, ordre et colonne de chaque bloc, blocs personnalisés
 * regroupant des champs de ce client. Enregistrée pour tout le client.
 */
export function CompanyLayoutDialog({
  open,
  clientName,
  layout,
  isCustom,
  fieldOptions,
  onClose,
  onSave,
  onReset,
}: CompanyLayoutDialogProps) {
  const [draft, setDraft] = useState<CompanyLayout>(layout);
  const [newTitle, setNewTitle] = useState("");
  const [newColumn, setNewColumn] = useState<LayoutColumn>("left");
  const [newFieldKeys, setNewFieldKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(layout);
      setNewTitle("");
      setNewFieldKeys([]);
      setError(null);
    }
  }, [open, layout]);

  if (!open) return null;

  function addBlock() {
    if (!newTitle.trim()) return;
    setDraft((d) =>
      addFieldsBlock(d, { id: `fields-${Date.now().toString(36)}`, title: newTitle, fieldKeys: newFieldKeys, column: newColumn }),
    );
    setNewTitle("");
    setNewFieldKeys([]);
  }

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fieldLabel = new Map(fieldOptions.map((f) => [f.key, f.label]));

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogHeader>
        <DialogTitle>Personnaliser la fiche entreprise — {clientName}</DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] space-y-4 overflow-y-auto">
        <p className="text-xs text-muted-foreground">
          Cette composition s'applique à toutes les fiches entreprise de ce client. Les autres clients gardent la leur
          (ou l'affichage par défaut).
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {LAYOUT_COLUMNS.map((column) => (
            <div key={column} className="space-y-1.5 rounded-md border border-border p-2">
              <p className="text-xs font-medium text-foreground">{LAYOUT_COLUMN_LABEL[column]}</p>
              {draft.columns[column].length === 0 && <p className="text-xs text-muted-foreground">Vide</p>}
              {draft.columns[column].map((block, index) => (
                <div key={block.id} className="space-y-1 rounded-md border border-border px-2 py-1.5 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={block.visible}
                      onChange={() => setDraft((d) => toggleBlockVisibility(d, block.id))}
                    />
                    <span className={block.visible ? "text-foreground" : "text-muted-foreground line-through"}>
                      {blockLabel(block)}
                    </span>
                  </label>
                  {block.type === "fields" && (
                    <p className="text-muted-foreground">
                      {block.fieldKeys.length > 0
                        ? block.fieldKeys.map((k) => fieldLabel.get(k) ?? k).join(", ")
                        : "Aucun champ"}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => setDraft((d) => moveBlockWithinColumn(d, block.id, -1))}
                      aria-label={`Monter ${blockLabel(block)}`}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === draft.columns[column].length - 1}
                      onClick={() => setDraft((d) => moveBlockWithinColumn(d, block.id, 1))}
                      aria-label={`Descendre ${blockLabel(block)}`}
                    >
                      ↓
                    </Button>
                    <select
                      aria-label={`Colonne de ${blockLabel(block)}`}
                      value={column}
                      onChange={(e) => setDraft((d) => moveBlockToColumn(d, block.id, e.target.value as LayoutColumn))}
                      className="rounded-md border border-border px-1 py-0.5"
                    >
                      {LAYOUT_COLUMNS.map((c) => (
                        <option key={c} value={c}>
                          {LAYOUT_COLUMN_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    {block.type === "fields" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraft((d) => removeFieldsBlock(d, block.id))}
                        aria-label={`Supprimer ${blockLabel(block)}`}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-foreground">Ajouter un bloc personnalisé</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder='Titre (ex. "Incidents substances toxiques")'
              className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm"
            />
            <select
              aria-label="Colonne du nouveau bloc"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value as LayoutColumn)}
              className="rounded-md border border-border px-2 py-1 text-sm"
            >
              {LAYOUT_COLUMNS.map((c) => (
                <option key={c} value={c}>
                  {LAYOUT_COLUMN_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          {fieldOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun champ disponible — crée d'abord les champs de ce client dans Champs personnalisés.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fieldOptions.map((f) => (
                <label key={f.key} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                  <input
                    type="checkbox"
                    checked={newFieldKeys.includes(f.key)}
                    onChange={() =>
                      setNewFieldKeys((prev) => (prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key]))
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          )}
          <Button type="button" size="sm" variant="outline" onClick={addBlock} disabled={!newTitle.trim()}>
            Ajouter le bloc
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
      <DialogFooter>
        {isCustom && (
          <Button type="button" variant="ghost" disabled={saving} onClick={() => run(onReset)}>
            Revenir à l'affichage par défaut
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" disabled={saving} onClick={() => run(() => onSave(draft))}>
          {saving ? "…" : "Enregistrer pour ce client"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
