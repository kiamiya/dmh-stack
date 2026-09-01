import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  variant: "default" | "success" | "destructive";
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, variant?: Toast["variant"], action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;
const AUTO_DISMISS_MS = 4000;
/** Un toast avec une action (ex. "Annuler") reste affiché plus longtemps, le temps de cliquer. */
const AUTO_DISMISS_WITH_ACTION_MS = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const toast = useCallback((message: string, variant: Toast["variant"] = "default", action?: ToastAction) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant, action }]);
    setTimeout(() => dismiss(id), action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                "flex items-center gap-3 rounded-md border border-border px-4 py-2 text-sm shadow-md",
                t.variant === "default" && "bg-card text-card-foreground",
                t.variant === "success" && "bg-success text-success-foreground border-transparent",
                t.variant === "destructive" && "bg-destructive text-destructive-foreground border-transparent",
              )}
            >
              <span>{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé à l'intérieur de <ToastProvider>");
  return ctx;
}
