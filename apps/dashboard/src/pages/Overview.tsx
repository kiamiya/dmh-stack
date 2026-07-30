import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { computeOverviewStats } from "../lib/pipeline";
import type { ProspectStatus, InteractionType } from "@dmh/types";

interface ProspectRow {
  status: ProspectStatus;
}

interface InteractionRow {
  type: InteractionType;
}

export function OverviewPage() {
  const [prospects, setProspects] = useState<ProspectRow[] | null>(null);
  const [interactions, setInteractions] = useState<InteractionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: prospectData, error: prospectError }, { data: interactionData, error: interactionError }] =
        await Promise.all([
          supabase.from("prospects").select("status"),
          supabase.from("interactions").select("type"),
        ]);

      if (cancelled) return;
      if (prospectError) setError(prospectError.message);
      else setProspects(prospectData as ProspectRow[]);

      if (interactionError) setError(interactionError.message);
      else setInteractions(interactionData as InteractionRow[]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!prospects || !interactions) return <div className="p-8 text-sm text-slate-500">Chargement…</div>;

  const stats = computeOverviewStats(prospects, interactions);

  const cards = [
    { label: "Prospects", value: stats.totalProspects },
    { label: "En séquence active", value: stats.inActiveSequence },
    { label: "Taux de réponse", value: stats.replyRate !== null ? `${stats.replyRate}%` : "—" },
    { label: "RDV programmés", value: stats.meetingsBooked },
    { label: "Deals gagnés", value: stats.won },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Vue d'ensemble</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
