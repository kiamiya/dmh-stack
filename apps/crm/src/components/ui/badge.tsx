import type { HTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        purple: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
