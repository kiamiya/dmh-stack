import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { DASHBOARD_BLOCKS } from "../lib/dashboardBlocks";

export interface DashboardBlocksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: string[];
  onSave: (blocks: string[]) => Promise<void>;
}

const CATEGORIES = Array.from(new Set(DASHBOARD_BLOCKS.map((b) => b.category)));

/** Sélection des blocs d'un dashboard nommé (S34-15) — catalogue fixe, groupé par catégorie (mêmes noms que les onglets de "Vue d'ensemble"). */
export function DashboardBlocksDialog({ open, onOpenChange, blocks, onSave }: DashboardBlocksDialogProps) {
  const [selected, setSelected] = useState<string[]>(blocks);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(blocks);
  }, [open, blocks]);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(selected);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Choisir les blocs</DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[60vh] space-y-4 overflow-y-auto">
        {CATEGORIES.map((category) => (
          <div key={category}>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</div>
            <div className="space-y-1.5">
              {DASHBOARD_BLOCKS.filter((b) => b.category === category).map((b) => (
                <label key={b.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(b.key)} onChange={() => toggle(b.key)} />
                  {b.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          Enregistrer
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
