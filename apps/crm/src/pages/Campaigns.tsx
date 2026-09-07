import { useMemo } from "react";
import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { useLinkedinInteractions } from "../hooks/useLinkedinInteractions";
import { computeCampaignStats } from "../lib/campaignStats";

export function CampaignsPage() {
  const { interactions, loading } = useLinkedinInteractions();
  const campaigns = useMemo(() => computeCampaignStats(interactions), [interactions]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <PageHeader kicker="Marketing · campagnes LinkedIn" title="Campagnes" />

      <p className="text-sm text-muted-foreground">
        Tableau de bord en lecture seule des campagnes LinkedIn Lemlist — la création et l'envoi des séquences
        restent dans Lemlist lui-même. Les chiffres viennent des interactions déjà synchronisées
        (<code>scripts/sync-lemlist.ts</code>), jamais d'un total inventé.
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.campaignId} blueprint>
              <CardContent className="space-y-2 p-4">
                <span className="font-heading text-base font-semibold text-foreground">{campaign.campaignName}</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="blue">{campaign.leadsCount} leads</Badge>
                  <Badge>{campaign.connectedCount} connectés</Badge>
                  <Badge variant="green">{campaign.repliedCount} réponses</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune campagne LinkedIn synchronisée pour l'instant.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
