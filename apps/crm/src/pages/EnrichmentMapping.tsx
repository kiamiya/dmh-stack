import { useMemo } from "react";
import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { useProspects } from "../hooks/useProspects";
import { getStatusLabel } from "../lib/status";
import { ENRICHMENT_CASCADE, computeCascadeStepCounts } from "../lib/enrichmentCascade";

export function EnrichmentMappingPage() {
  const { prospects, loading } = useProspects();
  const stepCounts = useMemo(() => computeCascadeStepCounts(prospects), [prospects]);
  const toEnrichCount = prospects.filter((p) => p.status === "to_enrich").length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <PageHeader kicker="Données & réglages · pipeline" title="Mapping enrichissement" />

      <p className="text-sm text-muted-foreground">
        Vue en lecture seule de la cascade d'enrichissement réellement exécutée par les Edge Functions
        (`enrich-pappers`, `enrich-dropcontact`) — un pipeline fixe à 2 étapes, pas un mapping par champ
        configurable. Les chiffres reflètent le nombre réel de prospects par statut, jamais une valeur inventée.
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <Card blueprint>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="text-xs text-muted-foreground">En attente d'enrichissement</div>
                <div className="text-2xl font-semibold text-foreground">{toEnrichCount}</div>
              </div>
              <Badge>{getStatusLabel("to_enrich")}</Badge>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {ENRICHMENT_CASCADE.map((step) => {
              const stepCount = stepCounts.find((c) => c.order === step.order);
              return (
                <Card key={step.order}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-base font-semibold text-foreground">
                        Étape {step.order} · {step.provider}
                      </span>
                      <Badge variant="blue">{stepCount?.count ?? 0} prospects</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">Déclenché par : {step.trigger}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {step.targetFields.map((field) => (
                        <span key={field} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground">
                          {field}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Statut atteint : {getStatusLabel(step.status)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
