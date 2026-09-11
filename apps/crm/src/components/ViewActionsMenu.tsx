import { DropdownMenu, DropdownMenuItem } from "./ui/dropdown-menu";
import { cn } from "../lib/cn";

export interface ViewActionsMenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export interface ViewActionsMenuProps {
  actions: ViewActionsMenuAction[];
  /** Libellé accessible du bouton déclencheur — dépend du contexte (vue/dossier). */
  title: string;
}

/**
 * Menu "..." consolidé (une seule instance, pas une icône par action) —
 * remplace les icônes ⧉/✎/× séparées construites au survol la session
 * précédente sur `ProspectsList.tsx` et `Lists.tsx`. Correction suite au
 * constat de Loïc : le mockup Claude Design ("Paramétrer la vue")
 * regroupe toujours ces actions dans un seul menu, jamais des icônes
 * dispersées.
 */
export function ViewActionsMenu({ actions, title }: ViewActionsMenuProps) {
  return (
    <DropdownMenu
      align="end"
      trigger={
        <button
          type="button"
          title={title}
          aria-label={title}
          className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          ⋯
        </button>
      }
    >
      {actions.map((action) => (
        <DropdownMenuItem
          key={action.label}
          onClick={action.onClick}
          className={cn(action.danger && "text-destructive hover:bg-destructive/10")}
        >
          {action.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
