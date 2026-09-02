import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import type { PipelineStage } from "@dmh/types";
import type { DealRow } from "../services/deals";
import { OpportunityCard } from "./OpportunityCard";

function DraggableCard({ deal }: { deal: DealRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <OpportunityCard deal={deal} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export interface OpportunityKanbanColumnProps {
  stage: PipelineStage;
  deals: DealRow[];
}

/** Même pattern que components/KanbanColumn.tsx, dupliqué pour les Opportunités (types différents, colonnes = étapes dynamiques). */
export function OpportunityKanbanColumn({ stage, deals }: OpportunityKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-secondary/50 p-2",
        isOver && "border-accent bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-semibold text-foreground">{stage.name}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <div className="flex min-h-[2rem] flex-col gap-2">
        {deals.map((d) => (
          <DraggableCard key={d.id} deal={d} />
        ))}
      </div>
    </div>
  );
}

export function OpportunityKanbanBoardShell({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 overflow-x-auto">{children}</div>;
}
