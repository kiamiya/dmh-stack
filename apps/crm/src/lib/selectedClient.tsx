import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface SelectedClientContextValue {
  clientId: string;
  setClientId: (id: string) => void;
}

const SelectedClientContext = createContext<SelectedClientContextValue | null>(null);

const STORAGE_KEY = "dmh-crm-selected-client";

function readInitialClientId(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Sélecteur de client DMH global (demande du CR du 11/09/2026) : "filtrer
 * une session de travail complète sur un client donné", partagé entre
 * toutes les pages plutôt qu'un `<select>` local par page. Posé au niveau
 * du layout protégé (même pattern que `ViewModeProvider`). Persisté en
 * `sessionStorage` (pas `localStorage`) : un choix qui vaut pour la
 * session de travail en cours dans cet onglet, pas une préférence à vie.
 */
export function SelectedClientProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState<string>(readInitialClientId);

  function setClientId(id: string) {
    setClientIdState(id);
    try {
      if (id) sessionStorage.setItem(STORAGE_KEY, id);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage indisponible — non bloquant, juste pas persisté.
    }
  }

  return <SelectedClientContext.Provider value={{ clientId, setClientId }}>{children}</SelectedClientContext.Provider>;
}

/** Hors du provider (pages non protégées) : toujours "Tous", jamais de client imposé par défaut. */
export function useSelectedClient(): SelectedClientContextValue {
  const ctx = useContext(SelectedClientContext);
  return ctx ?? { clientId: "", setClientId: () => {} };
}
