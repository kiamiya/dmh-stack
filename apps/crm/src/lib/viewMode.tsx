import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ViewMode = "sales" | "client_portal";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

/**
 * Bascule "Force de vente / Portail client" du mockup "Relais" — un vrai
 * mode masqué dans le CRM (pas un lien vers `apps/dashboard`, décision
 * explicite de Loïc), posé au niveau du layout protégé pour être lu par
 * n'importe quelle page sans prop-drilling. État en mémoire uniquement
 * (pas persisté) — c'est un mode de démonstration/vérification pour le
 * staff, pas une préférence utilisateur à retenir entre sessions.
 */
export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("sales");
  return <ViewModeContext.Provider value={{ viewMode, setViewMode }}>{children}</ViewModeContext.Provider>;
}

/** Hors du provider (pages non protégées) : toujours "sales", jamais masqué par défaut. */
export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  return ctx ?? { viewMode: "sales", setViewMode: () => {} };
}

/** Valeur affichée à la place d'une coordonnée brute en mode "Portail client". */
export const MASKED_VALUE = "•••••••••";
