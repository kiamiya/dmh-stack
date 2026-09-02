import { Link } from "react-router-dom";
import { useContacts } from "../hooks/useContacts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

export function ContactsPage() {
  const { contacts, loading, error } = useContacts();

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-6">
      <h1 className="text-lg font-semibold text-foreground">Contacts</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Entreprise principale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/contacts/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.first_name} {c.last_name}
                  </Link>
                </TableCell>
                <TableCell>{c.job_title ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell>{c.companies?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun contact.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
