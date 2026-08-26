import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "../lib/status";
import { formatScore, getScoreColor } from "../lib/score";
import { useProspects } from "../hooks/useProspects";
import type { ProspectStatus } from "@dmh/types";

export function ProspectsListPage() {
  const { prospects, loading, error } = useProspects();
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">("all");

  const filtered = useMemo(
    () => (statusFilter === "all" ? prospects : prospects.filter((p) => p.status === statusFilter)),
    [prospects, statusFilter],
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Prospects</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProspectStatus | "all")}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">Tous les statuts</option>
          {ALL_PROSPECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Chargement…</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Client DMH</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((prospect) => (
              <TableRow key={prospect.id}>
                <TableCell>
                  <Link to={`/prospects/${prospect.id}`} className="font-medium text-slate-900 hover:underline">
                    {prospect.companies?.name ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  {prospect.contacts
                    ? `${prospect.contacts.first_name} ${prospect.contacts.last_name}`
                    : "—"}
                </TableCell>
                <TableCell>{prospect.dmh_clients?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={getScoreColor(prospect.companies?.ai_score ?? null)}>
                    {formatScore(prospect.companies?.ai_score ?? null)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(prospect.status)}>{getStatusLabel(prospect.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  Aucun prospect.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
