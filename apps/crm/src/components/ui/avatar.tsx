import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { getAvatarColor, getInitials } from "../../lib/avatar";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "default";
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  default: "h-8 w-8 text-xs",
};

/** Avatar à initiales (pas d'image externe — aucune donnée n'a de logo/photo en base). */
export function Avatar({ name, size = "default", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        SIZE_CLASSES[size],
        getAvatarColor(name),
        className,
      )}
      title={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
}
