import type { ReactNode } from "react";
import { Button } from "./ui/button";

export interface QuickFilterChip {
  key: string;
  label: string;
  count: number;
  active: boolean;
}

export interface QuickFilterChipsProps {
  chips: QuickFilterChip[];
  onToggle: (key: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  /** Contenu du tiroir "Filtre avancé", affiché seulement si `showAdvanced`. */
  children?: ReactNode;
}

/**
 * Bloc "Filtres rapides" (chips à bascule + compteur réel) + tiroir
 * "Filtre avancé" replié par défaut — extrait de `ProspectsList.tsx`/
 * `EntreprisesPanel.tsx` (correction Claude Design) pour être réutilisé
 * sur Segments/Tâches/Pipeline.
 */
export function QuickFilterChips({ chips, onToggle, showAdvanced, onToggleAdvanced, hasActiveFilters, onReset, children }: QuickFilterChipsProps) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Filtres rapides</span>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => onToggle(chip.key)}
            className={`rounded-full border px-2.5 py-1 text-xs ${chip.active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}
          >
            {chip.label} <span className="opacity-60">{chip.count}</span>
          </button>
        ))}
        <button type="button" onClick={onToggleAdvanced} className="ml-1 text-xs text-accent hover:underline">
          + Filtre avancé
        </button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Réinitialiser
          </Button>
        )}
      </div>
      {showAdvanced && <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">{children}</div>}
    </div>
  );
}
