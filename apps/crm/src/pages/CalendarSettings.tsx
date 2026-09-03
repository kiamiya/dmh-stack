import { useEffect, useState } from "react";
import { useSession } from "../lib/useSession";
import { useCalendarConnections } from "../hooks/useCalendarConnections";
import { useUpcomingCalendarEvents } from "../hooks/useUpcomingCalendarEvents";
import { calendarOAuthConfig } from "../lib/supabase";
import { buildGoogleConnectUrl, buildMicrosoftConnectUrl } from "../lib/calendarOAuthLinks";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";

const PROVIDER_LABELS: Record<string, string> = { google: "Google Calendar", microsoft: "Microsoft / Outlook" };

export function CalendarSettingsPage() {
  const { session } = useSession();
  const { connections, loading, disconnect } = useCalendarConnections();
  const { events, loading: eventsLoading, error: eventsError } = useUpcomingCalendarEvents();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    <div className="mx-auto max-w-2xl space-y-4 p-6">
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
            <CardTitle>Prochains événements (14 prochains jours)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventsLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {eventsError && <p className="text-sm text-destructive">{eventsError}</p>}
            {!eventsLoading && !eventsError && events.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun événement à venir.</p>
            )}
            {!eventsLoading &&
              events.map((e, i) => (
                <div key={i} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                  <div>
                    <div className="text-foreground">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.start).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                  <Badge>{PROVIDER_LABELS[e.provider]}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Astuce : ajoute <code>?client=&lt;id du client DMH&gt;</code> à la fin du lien pour l'associer au bon
        client avant de le partager (ex. <code>{PROVIDER_LABELS.google} ...?client=xxxxxxxx-xxxx-...</code>).
      </p>
    </div>
  );
}
