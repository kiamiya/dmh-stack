import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export interface AssignedListCardProps {
  title: string;
  lists: Array<{ id: string; name: string }>;
  selectedListId: string;
  onAssign: (listId: string | null) => void;
  memberNames: string[];
}

/** Carte "Liste ... assignée" réutilisée par ContactDetail/CompanyDetail/OpportunityDetail (S23) — sélection d'une liste existante + lecture seule de ses membres. */
export function AssignedListCard({ title, lists, selectedListId, onAssign, memberNames }: AssignedListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <select
          value={selectedListId}
          onChange={(e) => onAssign(e.target.value || null)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="">Aucune</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        {selectedListId && (
          <div className="text-sm text-muted-foreground">
            {memberNames.length === 0 ? "Liste vide." : memberNames.join(", ")}
          </div>
        )}
        {lists.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucune liste disponible pour ce client.</p>
        )}
      </CardContent>
    </Card>
  );
}
