import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

export type ProspectSubView = "list" | "kanban" | "contacts" | "companies";

const TABS: Array<{ key: ProspectSubView; label: string; to: string }> = [
  { key: "list", label: "Vue globale", to: "/" },
  { key: "kanban", label: "Kanban", to: "/?view=kanban" },
  { key: "contacts", label: "Contacts", to: "/contacts" },
  { key: "companies", label: "Entreprises", to: "/companies" },
];

export interface ProspectSubNavProps {
  active: ProspectSubView;
  /**
   * Bascule locale (sans navigation) pour "list"/"kanban" — utilisé
   * uniquement depuis `ProspectsList.tsx`, où les deux vues vivent sur la
   * même page. Omis depuis `Contacts.tsx`/`Companies.tsx` : ces deux
   * entrées redeviennent alors de vrais liens vers `/`.
   */
  onLocalChange?: (view: "list" | "kanban") => void;
}

/**
 * Sous-navigation partagée entre les 4 vues de la base Prospect/Contacts/
 * Entreprises (S33 : Contacts/Entreprises retirés de la sidebar, remplacés
 * par cet accès depuis n'importe laquelle des 4 vues plutôt que perdus).
 */
export function ProspectSubNav({ active, onLocalChange }: ProspectSubNavProps) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const className = cn(
          "rounded px-2 py-1 text-xs font-medium",
          isActive ? "bg-secondary" : "text-muted-foreground hover:text-foreground",
        );
        const localKey = tab.key === "list" || tab.key === "kanban" ? tab.key : null;
        if (localKey && onLocalChange) {
          return (
            <button key={tab.key} type="button" onClick={() => onLocalChange(localKey)} className={className}>
              {tab.label}
            </button>
          );
        }
        return (
          <Link key={tab.key} to={tab.to} className={className}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
