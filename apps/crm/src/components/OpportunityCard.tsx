import { Link } from "react-router-dom";
import { isStagnant } from "../lib/stagnation";
import { formatRelativeTime } from "../lib/relativeTime";
import { formatCurrency } from "../lib/deals";
import type { DealRow } from "../services/deals";

export interface OpportunityCardProps {
  deal: DealRow;
  dragHandleProps?: Record<string, unknown>;
}

/** Carte Kanban Opportunité — même esprit que ProspectCard.tsx, dupliquée plutôt que généralisée (types différents). */
export function OpportunityCard({ deal, dragHandleProps }: OpportunityCardProps) {
  const stagnant = isStagnant(deal.updated_at);

  return (
    <div
      {...dragHandleProps}
      className="cursor-grab rounded-md border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
    >
      <Link
        to={`/opportunities/${deal.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block truncate text-sm font-medium text-foreground hover:underline"
      >
        {deal.company_name}
      </Link>
      <div className="truncate text-xs text-muted-foreground">
        {deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : "—"}
      </div>
      <div className="mt-1 text-sm text-foreground">{formatCurrency(deal.deal_value)}</div>
      <div className="mt-1 flex items-center gap-1 text-xs">
        <span className={stagnant ? "font-medium text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}>
          {stagnant && "⚠ "}Dernière activité : {formatRelativeTime(deal.updated_at)}
        </span>
      </div>
    </div>
  );
}
