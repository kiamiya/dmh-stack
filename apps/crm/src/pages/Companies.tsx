import { Link } from "react-router-dom";
import { useState } from "react";
import { useCompanies } from "../hooks/useCompanies";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { formatScore, getScoreColor } from "../lib/score";
import { AddCompanyDialog } from "../components/AddCompanyDialog";

export function CompaniesPage() {
  const { companies, loading, error, reload } = useCompanies();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Entreprises</h1>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          + Entreprise
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Score IA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/companies/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.city ?? "—"}</TableCell>
                <TableCell>{c.naf_label ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={getScoreColor(c.ai_score)}>{formatScore(c.ai_score)}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucune entreprise.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => reload()} />
    </div>
  );
}
