import { useEffect, useState } from "react";
import { useSession } from "../lib/useSession";
import { useCalendarConnections } from "../hooks/useCalendarConnections";
import { useUpcomingCalendarEvents } from "../hooks/useUpcomingCalendarEvents";
import { calendarOAuthConfig } from "../lib/supabase";
import { buildGoogleConnectUrl, buildMicrosoftConnectUrl } from "../lib/calendarOAuthLinks";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CalendarEventGrid } from "../components/CalendarEventGrid";
import { EditCalendarEventDialog } from "../components/EditCalendarEventDialog";
import { useToast } from "../components/ui/toast";
import type { UpcomingCalendarEvent } from "../services/calendarEvents";

const PROVIDER_LABELS: Record<string, string> = { google: "Google Calendar", microsoft: "Microsoft / Outlook" };

export function CalendarSettingsPage() {
  const { session } = useSession();
  const { connections, loading, disconnect } = useCalendarConnections();
  const { events, loading: eventsLoading, error: eventsError, updateEvent } = useUpcomingCalendarEvents();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<UpcomingCalendarEvent | null>(null);

  const staffId = session?.user.id;
  const googleConnection = connections.find((c) => c.provider === "google");
  const microsoftConnection = connections.find((c) => c.provider === "microsoft");
  const hasAnyConnection = connections.length > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("calendar_connected");
    const failed = params.get("calendar_error");
    if (connected) {
      toast(`${PROVIDER_LABELS[connected] ?? connected} connecté avec succès.`, "success");
    } else if (failed) {
      toast("Échec de la connexion du calendrier — réessaie.", "destructive");
    }
    if (connected || failed) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bookingUrl(token: string): string {
    return `${window.location.origin}/book/${token}`;
  }

  async function copyLink(connectionId: string, token: string) {
    await navigator.clipboard.writeText(bookingUrl(token));
    setCopiedId(connectionId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDisconnect(id: string) {
    try {
      await disconnect(id);
      toast("Calendrier déconnecté.", "success");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  if (loading || !staffId) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-lg font-semibold text-foreground">Mon calendrier</h1>
      <p className="text-sm text-muted-foreground">
        Connecte ton calendrier pour obtenir un lien de prise de RDV que tu peux partager avec un prospect — il
        verra tes disponibilités réelles et un événement sera créé automatiquement des deux côtés.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {googleConnection ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="green">Connecté</Badge>
                <span className="text-muted-foreground">{googleConnection.provider_account_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={bookingUrl(googleConnection.booking_token)}
                  className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground"
                />
                <Button size="sm" variant="outline" onClick={() => copyLink(googleConnection.id, googleConnection.booking_token)}>
                  {copiedId === googleConnection.id ? "Copié !" : "Copier"}
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDisconnect(googleConnection.id)}>
                Déconnecter
              </Button>
            </>
          ) : (
            <a href={buildGoogleConnectUrl(calendarOAuthConfig, staffId, window.location.origin)}>
              <Button size="sm">Connecter Google Calendar</Button>
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Microsoft / Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {microsoftConnection ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="green">Connecté</Badge>
                <span className="text-muted-foreground">{microsoftConnection.provider_account_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={bookingUrl(microsoftConnection.booking_token)}
                  className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground"
                />
                <Button size="sm" variant="outline" onClick={() => copyLink(microsoftConnection.id, microsoftConnection.booking_token)}>
                  {copiedId === microsoftConnection.id ? "Copié !" : "Copier"}
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDisconnect(microsoftConnection.id)}>
                Déconnecter
              </Button>
            </>
          ) : (
            <a href={buildMicrosoftConnectUrl(calendarOAuthConfig, staffId, window.location.origin)}>
              <Button size="sm">Connecter Outlook</Button>
            </a>
          )}
        </CardContent>
      </Card>

      {hasAnyConnection && (
        <Card>
          <CardHeader>
            <CardTitle>Calendrier</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {eventsError && <p className="text-sm text-destructive">{eventsError}</p>}
            {!eventsLoading && !eventsError && (
              <CalendarEventGrid events={events} onSelectEvent={setEditingEvent} />
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Astuce : ajoute <code>?client=&lt;id du client DMH&gt;</code> à la fin du lien pour l'associer au bon
        client avant de le partager (ex. <code>{PROVIDER_LABELS.google} ...?client=xxxxxxxx-xxxx-...</code>).
      </p>

      <EditCalendarEventDialog event={editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)} onUpdated={updateEvent} />
    </div>
  );
}
