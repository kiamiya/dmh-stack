import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { ViewActionsMenu } from "./ViewActionsMenu";
import type { ViewActionsMenuAction } from "./ViewActionsMenu";

export interface ViewTab {
  id: string;
  label: string;
  count?: number;
}

export interface SavedViewTabsProps {
  /** Onglets déjà fusionnés (onglets système type "Tous les contacts"/"À faire" + vues enregistrées de l'utilisateur), dans l'ordre d'affichage. */
  tabs: ViewTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  createLabel?: string;
  /** Icônes/contrôles additionnels affichés à droite avant le menu "..." (ex. synchroniser, bascule liste/kanban). */
  extra?: ReactNode;
  menuActions: ViewActionsMenuAction[];
  menuTitle?: string;
}

/**
 * Rangée d'onglets de vues + menu "..." consolidé — extrait de
 * `ProspectsList.tsx` (correction Claude Design) pour être réutilisé
 * sur Segments/Tâches/Pipeline sans retaper le même pattern.
 */
export function SavedViewTabs({
  tabs,
  activeId,
  onSelect,
  onCreate,
  createLabel = "+ Nouvelle vue",
  extra,
  menuActions,
  menuTitle = "Paramétrer la vue",
}: SavedViewTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            "max-w-[10rem] truncate border-b-2 px-3 py-1.5 text-sm font-medium",
            activeId === tab.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.count != null && <span className="ml-1 text-xs opacity-70">{tab.count}</span>}
        </button>
      ))}
      <button type="button" onClick={onCreate} className="px-3 py-1.5 text-sm text-accent hover:underline">
        {createLabel}
      </button>
      <div className="ml-auto flex items-center gap-1">
        {extra}
        <ViewActionsMenu title={menuTitle} actions={menuActions} />
      </div>
    </div>
  );
}
