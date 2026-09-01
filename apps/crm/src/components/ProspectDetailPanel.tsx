import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { ProspectDetailContent } from "./ProspectDetailContent";

/**
 * Fiche prospect en panneau latéral — ouverte par-dessus la liste/le
 * Kanban en arrière-plan (route "fantôme" superposée via le pattern
 * background-location de React Router, voir App.tsx) plutôt que de
 * naviguer en plein écran et perdre le scroll/les filtres/la sélection
 * de la page d'origine.
 */
export function ProspectDetailPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  function close() {
    navigate(-1);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!id) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-foreground/40" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background shadow-xl"
      >
        <div className="p-6">
          <ProspectDetailContent
            id={id}
            headerSlot={
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer"
                  className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  ✕ Fermer
                </button>
              </div>
            }
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
