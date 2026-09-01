import { useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Modal minimale écrite à la main (pas de Radix — non approuvé pour cette
 * refonte) : portail, fermeture sur Escape/clic backdrop, focus initial sur
 * le contenu. Pas un vrai focus-trap complet (tab peut sortir de la modale)
 * — acceptable pour un outil interne staff, à revoir si un vrai besoin
 * d'accessibilité stricte apparaît.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Effet séparé du keydown ci-dessous, et dépendant uniquement de `open` :
  // si `onOpenChange` était dans les deps ici, une fonction inline recréée
  // à chaque frappe (cas courant : `onOpenChange={(v) => ...}` dans un
  // parent qui re-render à chaque keystroke) redéclencherait ce focus en
  // boucle et volerait le focus clavier au champ actif à chaque lettre.
  useEffect(() => {
    // Ne vole pas le focus si un champ interne l'a déjà pris (ex. un input
    // `autoFocus`) — sinon la modale se referme sur elle-même juste après
    // l'ouverture, empêchant de taper immédiatement.
    if (open && !contentRef.current?.contains(document.activeElement)) {
      contentRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="presentation">
      <div
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card text-card-foreground shadow-lg focus:outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-border p-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}

export function DialogContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 border-t border-border p-4", className)} {...props} />;
}
