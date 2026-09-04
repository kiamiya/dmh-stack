import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { BlueprintCorners } from "./blueprint-corners";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-background hover:bg-secondary",
        ghost: "hover:bg-secondary",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Ajoute les repères d'angle "plan technique" (S29) — réservé aux boutons d'action principale (variant "default"). */
  blueprint?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, blueprint, children, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), blueprint && "blueprint", className)} {...props}>
      {blueprint && <BlueprintCorners />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
