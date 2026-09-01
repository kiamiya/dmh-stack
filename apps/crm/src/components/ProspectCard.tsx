import { Link } from "react-router-dom";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { formatScore, getScoreColor } from "../lib/score";
import { formatRelativeTime } from "../lib/relativeTime";
import { isStagnant } from "../lib/stagnation";
import type { ProspectListRow } from "../services/prospects";

export interface ProspectCardProps {
  prospect: ProspectListRow;
  dragHandleProps?: Record<string, unknown>;
}

/** Carte compacte utilisée sur le Kanban : entreprise, contact, score IA, dernière interaction. */
export function ProspectCard({ prospect, dragHandleProps }: ProspectCardProps) {
  const companyName = prospect.companies?.name ?? "—";
  const contactName = prospect.contacts
    ? `${prospect.contacts.first_name} ${prospect.contacts.last_name}`
    : "—";
  const stagnant = isStagnant(prospect.last_activity_at);

  return (
    <div
      {...dragHandleProps}
      className="cursor-grab rounded-md border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <Avatar name={companyName} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/prospects/${prospect.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block truncate text-sm font-medium text-foreground hover:underline"
          >
            {companyName}
          </Link>
          <div className="truncate text-xs text-muted-foreground">{contactName}</div>
        </div>
        <Badge variant={getScoreColor(prospect.companies?.ai_score ?? null)}>
          {formatScore(prospect.companies?.ai_score ?? null)}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span className={stagnant ? "font-medium text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}>
          {stagnant && "⚠ "}Dernière activité : {formatRelativeTime(prospect.last_activity_at)}
        </span>
      </div>
    </div>
  );
}
