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
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-secondary/50 p-2",
        isOver && "border-accent bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {prospects.length}
        </span>
      </div>
      <div className="flex min-h-[2rem] flex-col gap-2">
        {prospects.map((p) => (
          <DraggableCard key={p.id} prospect={p} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardShell({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 overflow-x-auto p-6">{children}</div>;
}
