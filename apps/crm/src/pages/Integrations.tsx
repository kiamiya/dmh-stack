import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { useIntegrations } from "../hooks/useIntegrations";
import { getInitials } from "../lib/avatar";

const DESCRIPTIONS: Record<string, string> = {
  pappers: "Données légales et financières des entreprises françaises (SIREN, effectif, CA, forme juridique).",
  dropcontact: "Enrichissement et vérification d'emails professionnels à partir du nom et de l'entreprise.",
  smartlead: "Envoi de séquences email et suivi des réponses/ouvertures/clics.",
  lemlist: "Prospection LinkedIn : demandes de connexion, messages, suivi des réponses.",
};

export function IntegrationsPage() {
  const { integrations, loading, error } = useIntegrations();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <PageHeader kicker="Données & réglages · fournisseurs" title="Intégrations" />

      <p className="text-sm text-muted-foreground">
        Fournisseurs réellement utilisés par le pipeline de prospection. Le statut reflète la présence de la clé
        d'API côté serveur — pas de suivi d'usage/quota pour l'instant, ce n'est pas encore tracé en base.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.key} blueprint>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border font-heading text-xs text-foreground">
                    {getInitials(integration.label)}
                  </span>
                  <span className="font-heading text-base font-semibold text-foreground">{integration.label}</span>
                  <span
                    className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${integration.configured ? "bg-green-500" : "bg-yellow-500"}`}
                  />
                </div>
                <p className="min-h-8 text-xs text-muted-foreground">{DESCRIPTIONS[integration.key] ?? ""}</p>
                <div className="border-t border-border pt-2">
                  <Badge variant={integration.configured ? "green" : "yellow"}>
                    {integration.configured ? "Connecté" : "Non configuré"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
