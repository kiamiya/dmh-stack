import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { ProspectStatus } from "@dmh/types";
import { useKanbanProspects } from "../hooks/useKanbanProspects";
import { groupProspectsByStatus } from "../lib/kanban";
import { KanbanBoardShell, KanbanColumn } from "../components/KanbanColumn";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/ui/page-header";
import { useToast } from "../components/ui/toast";

export function PipelinePage() {
  const { prospects, loading, error, moveProspect } = useKanbanProspects();
  const { toast } = useToast();
  const groups = groupProspectsByStatus(prospects);
  // Distance d'activation : sans elle, dnd-kit intercepte le moindre clic comme
  // un début de glisser-déposer, ce qui empêche le clic sur le lien de la carte
  // (vers la fiche détail) de jamais se déclencher.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

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

  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;

  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <PageHeader kicker="Prospection · vue Kanban" title="Pipeline" />
      {loading ? (
        <div className="grid flex-1 min-h-0 grid-flow-col auto-cols-fr gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-full" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <KanbanBoardShell>
            {groups.map((group) => (
              <KanbanColumn key={group.column.status} column={group.column} prospects={group.prospects} />
            ))}
          </KanbanBoardShell>
        </DndContext>
      )}
    </div>
  );
}
