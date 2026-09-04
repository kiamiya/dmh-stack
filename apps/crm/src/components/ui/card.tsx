import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { BlueprintCorners } from "./blueprint-corners";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Ajoute les repères d'angle "plan technique" (S29) — pour les cartes mises en avant (KPI, formulaires), pas les conteneurs de tableau. */
  blueprint?: boolean;
}

export function Card({ className, blueprint, children, ...props }: CardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", blueprint && "blueprint", className)} {...props}>
      {blueprint && <BlueprintCorners />}
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-border p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
