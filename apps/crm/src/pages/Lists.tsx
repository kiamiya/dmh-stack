import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { useListsOverview } from "../hooks/useListsOverview";
import type { ListEntityType } from "../lib/listsOverview";

const ENTITY_LABELS: Record<ListEntityType, string> = {
  contact: "Contacts",
  company: "Entreprises",
  opportunity: "Opportunités",
};

const ENTITY_ROUTES: Record<ListEntityType, string> = {
  contact: "/contacts",
  company: "/companies",
  opportunity: "/opportunities",
};

export function ListsPage() {
  const { rows, loading } = useListsOverview();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <PageHeader kicker="Prospection · toutes les listes" title="Segments" />

      <p className="text-sm text-muted-foreground">
        Toutes les listes de Contacts, Entreprises et Opportunités, tous clients confondus — statiques ou
        dynamiques. Les effectifs sont réels (comptage direct pour les statiques, évaluation des critères pour
        les dynamiques).
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                    <TableCell>
                      <Badge>{ENTITY_LABELS[row.entityType]}</Badge>
                    </TableCell>
                    <TableCell>{row.mode === "dynamic" ? "Dynamique" : "Statique"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.memberCount}</TableCell>
                    <TableCell>
                      <Link to={ENTITY_ROUTES[row.entityType]} className="text-sm text-accent hover:underline">
                        Voir
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucune liste pour l'instant.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
