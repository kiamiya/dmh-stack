import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

export interface DashboardMetaValues {
  name: string;
  description: string | null;
  color: string | null;
}

export interface DashboardMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DashboardMetaValues | null;
  onSave: (values: DashboardMetaValues) => Promise<void>;
}

const COLOR_SWATCHES = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#64748b"];

/** Création/renommage d'un dashboard nommé (S34-15 + conformité Claude Design) — nom + description courte + couleur de repère, au lieu des window.prompt initiaux. */
export function DashboardMetaDialog({ open, onOpenChange, initial, onSave }: DashboardMetaDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setColor(initial?.color ?? null);
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() || null, color });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{initial ? "Modifier le tableau de bord" : "Créer un tableau de bord"}</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionnel"
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Couleur</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setColor(null)}
              className={`h-6 w-6 rounded-full border border-border text-xs ${color === null ? "ring-2 ring-accent" : ""}`}
              aria-label="Aucune couleur"
            >
              —
            </button>
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-accent ring-offset-1" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
          Enregistrer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
