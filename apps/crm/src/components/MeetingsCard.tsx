import { useMeetings } from "../hooks/useMeetings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export interface MeetingsCardProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

/** Carte "Rendez-vous" réutilisée par ContactDetail/CompanyDetail/OpportunityDetail — événements de calendrier liés à cette fiche (S19). Lecture seule : l'édition reste sur le calendrier pour ne pas dupliquer la logique de synchro Google/Microsoft. */
export function MeetingsCard({ contactId, companyId, dealId }: MeetingsCardProps) {
  const { meetings, loading } = useMeetings();

  if (loading) return null;

  const related = meetings.filter(
    (m) =>
      (contactId && m.contact_id === contactId) ||
      (companyId && m.company_id === companyId) ||
      (dealId && m.deal_id === dealId),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendez-vous ({related.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {related.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span>{m.title}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(m.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        ))}
        {related.length === 0 && <p className="text-sm text-muted-foreground">Aucun rendez-vous lié.</p>}
      </CardContent>
    </Card>
  );
}
