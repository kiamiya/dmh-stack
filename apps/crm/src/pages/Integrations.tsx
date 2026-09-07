import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { useIntegrations } from "../hooks/useIntegrations";

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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((integration) => (
            <Card key={integration.key} blueprint>
              <CardContent className="flex items-center justify-between p-4">
                <span className="font-heading text-base font-semibold text-foreground">{integration.label}</span>
                <Badge variant={integration.configured ? "green" : "yellow"}>
                  {integration.configured ? "Connecté" : "Non configuré"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
