import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { ProspectStatus } from "@dmh/types";
import { useKanbanProspects } from "../hooks/useKanbanProspects";
import { groupProspectsByStatus } from "../lib/kanban";
import { KanbanBoardShell, KanbanColumn } from "../components/KanbanColumn";
import { Skeleton } from "../components/ui/skeleton";
import { useToast } from "../components/ui/toast";

export function PipelinePage() {
  const { prospects, loading, error, moveProspect } = useKanbanProspects();
  const { toast } = useToast();
  const groups = groupProspectsByStatus(prospects);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const prospectId = String(active.id);
    const targetStatus = over.id as ProspectStatus;
    const current = prospects.find((p) => p.id === prospectId);
    if (!current || current.status === targetStatus) return;

    const result = await moveProspect(prospectId, targetStatus);
    if (!result.ok) toast(`Échec du changement de statut : ${result.error}`, "destructive");
  }

  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <KanbanBoardShell>
        {groups.map((group) => (
          <KanbanColumn key={group.column.status} column={group.column} prospects={group.prospects} />
        ))}
      </KanbanBoardShell>
    </DndContext>
  );
}
