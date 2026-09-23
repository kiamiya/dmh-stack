import { AddCalendarEventDialog } from "./AddCalendarEventDialog";
import { useUpcomingCalendarEvents } from "../hooks/useUpcomingCalendarEvents";
import type { CalendarConnection } from "../services/calendarConnections";

export interface QuickMeetingDialogProps {
  onClose: () => void;
  connections: CalendarConnection[];
  defaults: { clientId?: string; companyId?: string; contactId?: string };
}

/**
 * Action rapide "Réunion" d'une fiche (S38-8). Monté uniquement à l'ouverture :
 * `useUpcomingCalendarEvents` interroge Google/Microsoft dès son montage, inutile
 * à chaque affichage de fiche.
 */
export function QuickMeetingDialog({ onClose, connections, defaults }: QuickMeetingDialogProps) {
  const { addEvent } = useUpcomingCalendarEvents();
  return (
    <AddCalendarEventDialog
      open
      onOpenChange={(open) => !open && onClose()}
      connections={connections}
      onCreated={addEvent}
      defaults={defaults}
    />
  );
}
