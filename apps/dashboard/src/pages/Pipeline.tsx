import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { groupProspectsByColumn } from "../lib/pipeline";
import { getStatusColor, getStatusLabel } from "../lib/status";
import type { ProspectStatus } from "@dmh/types";

interface ProspectRow {
  id: string;
  status: ProspectStatus;
  companies: { name: string } | null;
  contacts: { first_name: string; last_name: string } | null;
}

export function PipelinePage() {
  const [prospects, setProspects] = useState<ProspectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from("prospects")
        .select("id, status, companies(name), contacts(first_name, last_name)");

      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      else setProspects((data ?? []) as unknown as ProspectRow[]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!prospects) return <div className="p-8 text-sm text-slate-500">Chargement…</div>;

  const groups = groupProspectsByColumn(prospects);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {groups.map(({ column, prospects: columnProspects }) => (
          <Card key={column.key} className="w-64 flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{column.label}</span>
                <span className="text-slate-400">{columnProspects.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {columnProspects.length === 0 && (
                <p className="text-xs text-slate-400">Aucun prospect.</p>
              )}
              {columnProspects.map((prospect) => (
                <div key={prospect.id} className="rounded-md border border-slate-200 p-2 text-xs">
                  <div className="font-medium text-slate-900">{prospect.companies?.name ?? "—"}</div>
                  <div className="text-slate-500">
                    {prospect.contacts
                      ? `${prospect.contacts.first_name} ${prospect.contacts.last_name}`
                      : "—"}
                  </div>
                  <Badge variant={getStatusColor(prospect.status)} className="mt-1">
                    {getStatusLabel(prospect.status)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
