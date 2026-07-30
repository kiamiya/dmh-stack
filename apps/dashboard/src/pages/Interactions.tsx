import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { getInteractionTypeColor, getInteractionTypeLabel } from "../lib/interactionLabels";
import type { InteractionChannel, InteractionType } from "@dmh/types";

interface InteractionRow {
  id: string;
  type: InteractionType;
  channel: InteractionChannel;
  subject: string | null;
  content: string | null;
  occurred_at: string;
  prospects: {
    companies: { name: string } | null;
    contacts: { first_name: string; last_name: string } | null;
  } | null;
}

export function InteractionsPage() {
  const [interactions, setInteractions] = useState<InteractionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from("interactions")
        .select(
          "id, type, channel, subject, content, occurred_at, prospects(companies(name), contacts(first_name, last_name))",
        )
        .order("occurred_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      else setInteractions((data ?? []) as unknown as InteractionRow[]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!interactions) return <div className="p-8 text-sm text-slate-500">Chargement…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Interactions</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Entreprise</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interactions.map((interaction) => (
            <TableRow key={interaction.id}>
              <TableCell className="whitespace-nowrap text-slate-500">
                {new Date(interaction.occurred_at).toLocaleString("fr-FR")}
              </TableCell>
              <TableCell>
                <Badge variant={getInteractionTypeColor(interaction.type)}>
                  {getInteractionTypeLabel(interaction.type)}
                </Badge>
              </TableCell>
              <TableCell>{interaction.prospects?.companies?.name ?? "—"}</TableCell>
              <TableCell>
                {interaction.prospects?.contacts
                  ? `${interaction.prospects.contacts.first_name} ${interaction.prospects.contacts.last_name}`
                  : "—"}
              </TableCell>
              <TableCell className="max-w-xs truncate" title={interaction.content ?? undefined}>
                {interaction.subject ?? interaction.content ?? "—"}
              </TableCell>
            </TableRow>
          ))}
          {interactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-500">
                Aucune interaction.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
