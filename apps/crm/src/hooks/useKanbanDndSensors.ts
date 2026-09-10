import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

/**
 * Sans `activationConstraint`, dnd-kit intercepte le moindre clic comme un
 * début de glisser-déposer, ce qui empêche le clic sur une carte (lien vers
 * la fiche détail) de jamais se déclencher — factorisé ici pour ne pas
 * dupliquer ce correctif dans chaque Kanban (Prospects, Opportunités).
 */
export function useKanbanDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
}
