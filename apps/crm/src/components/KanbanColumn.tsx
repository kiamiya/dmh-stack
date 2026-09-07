import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import type { KanbanColumn as KanbanColumnDef } from "../lib/kanban";
import type { ProspectListRow } from "../services/prospects";
import { ProspectCard } from "./ProspectCard";

function DraggableCard({ prospect }: { prospect: ProspectListRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: prospect.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <ProspectCard prospect={prospect} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export interface KanbanColumnProps {
  column: KanbanColumnDef;
  prospects: ProspectListRow[];
}

export function KanbanColumn({ column, prospects }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-secondary/50 p-2",
        isOver && "border-accent bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between gap-1 px-1 pb-2">
        <span className="truncate text-xs font-semibold text-foreground" title={column.label}>
          {column.label}
        </span>
        <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {prospects.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {prospects.map((p) => (
          <DraggableCard key={p.id} prospect={p} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardShell({ children }: { children: ReactNode }) {
  return <div className="grid min-h-0 flex-1 auto-cols-fr grid-flow-col gap-2">{children}</div>;
}
