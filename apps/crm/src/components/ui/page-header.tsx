import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Petit libellé en majuscules au-dessus du titre — contexte de l'écran (S29, design "Relais"). */
  kicker: string;
  title: string;
  /** Actions alignées à droite (boutons, bascules de vue) — même ligne que le titre. */
  actions?: ReactNode;
}

export function PageHeader({ kicker, title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{kicker}</span>
        <h1 className="text-xl leading-tight text-foreground">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
