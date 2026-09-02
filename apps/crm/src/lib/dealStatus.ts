import type { DealStatus } from "../services/deals";
import type { badgeVariants } from "../components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const LABELS: Record<DealStatus, string> = {
  negotiation: "En négociation",
  won: "Gagnée",
  lost: "Perdue",
};

const COLORS: Record<DealStatus, BadgeVariant> = {
  negotiation: "blue",
  won: "green",
  lost: "red",
};

export function getDealStatusLabel(status: DealStatus): string {
  return LABELS[status];
}

export function getDealStatusColor(status: DealStatus): BadgeVariant {
  return COLORS[status];
}

export const ALL_DEAL_STATUSES: DealStatus[] = ["negotiation", "won", "lost"];
