import { useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useClients } from "../hooks/useClients";
import { useContacts } from "../hooks/useContacts";
import { useCompanies } from "../hooks/useCompanies";
import { useListFolders } from "../hooks/useListFolders";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import { addContactsToList, createList as createContactList } from "../services/contactLists";
import { addCompaniesToList, createList as createCompanyList } from "../services/companyLists";
import { parseCsv } from "../lib/csv";
import { matchCsvRows } from "../lib/csvImportMatch";
import { useToast } from "./ui/toast";

export interface ImportListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type ImportEntityType = "contact" | "company";
type CompanyMatchField = "siren" | "name";

/**
 * Crée une liste statique à partir d'un fichier CSV — associe chaque ligne
 * à une entité déjà existante (email pour un contact, SIREN ou nom pour
 * une entreprise) via `matchCsvRows`. N'importe jamais d'entité qui
 * n'existe pas déjà en base (pas de création à la volée depuis un CSV mal
 * formé) : les lignes sans correspondance sont comptées et rapportées,
 * jamais silencieusement ignorées.
 */
export function ImportListDialog({ open, onOpenChange, onImported }: ImportListDialogProps) {
  const clients = useClients();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const staff = useStaffMembers();
  const { session } = useSession();
  const { toast } = useToast();
  const createdBy = session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null;

  const [clientId, setClientId] = useState("");
  const [entityType, setEntityType] = useState<ImportEntityType>("contact");
  const [companyMatchField, setCompanyMatchField] = useState<CompanyMatchField>("siren");
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [column, setColumn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { folders } = useListFolders(clientId);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  function reset() {
    setClientId("");
    setEntityType("contact");
    setCompanyMatchField("siren");
    setName("");
    setFolderId("");
    setFileName("");
    setRows([]);
    setColumn("");
    setError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setColumn(parsed.length > 0 ? Object.keys(parsed[0])[0] : "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }
    if (!name.trim()) {
      setError("Le nom de la liste est requis.");
      return;
    }
    if (rows.length === 0 || !column) {
      setError("Choisis un fichier CSV et la colonne à utiliser pour la correspondance.");
      return;
    }

    const entities =
      entityType === "contact"
        ? contacts.filter((c) => c.client_id === clientId).map((c) => ({ id: c.id, key: c.email }))
        : companies
            .filter((c) => c.client_id === clientId)
            .map((c) => ({ id: c.id, key: companyMatchField === "siren" ? c.siren : c.name }));

    const { matchedIds, unmatchedCount } = matchCsvRows(rows, column, entities);

    if (matchedIds.length === 0) {
      setError("Aucune correspondance trouvée avec des entités existantes pour ce client.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (entityType === "contact") {
        const { id } = await createContactList(supabase, { clientId, name: name.trim(), createdBy, folderId: folderId || null });
        await addContactsToList(supabase, clientId, id, matchedIds);
      } else {
        const { id } = await createCompanyList(supabase, { clientId, name: name.trim(), createdBy, folderId: folderId || null });
        await addCompaniesToList(supabase, clientId, id, matchedIds);
      }

      toast(
        unmatchedCount > 0
          ? `Liste "${name.trim()}" créée — ${matchedIds.length} ajouté(s), ${unmatchedCount} ligne(s) non reconnue(s) ignorée(s).`
          : `Liste "${name.trim()}" créée — ${matchedIds.length} ajouté(s).`,
        "success",
      );
      onImported();
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Importer un fichier</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-client">
              Client DMH
            </label>
            <select
              id="import-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Sélectionner…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-entity-type">
              Type d'entité
            </label>
            <select
              id="import-entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as ImportEntityType)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="contact">Contacts (correspondance par email)</option>
              <option value="company">Entreprises</option>
            </select>
          </div>
          {entityType === "company" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-company-match">
                Correspondance par
              </label>
              <select
                id="import-company-match"
                value={companyMatchField}
                onChange={(e) => setCompanyMatchField(e.target.value as CompanyMatchField)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="siren">SIREN</option>
                <option value="name">Nom</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-name">
              Nom de la liste
            </label>
            <input
              id="import-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          {clientId && folders.length > 0 && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-folder">
                Dossier (optionnel)
              </label>
              <select
                id="import-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">Aucun</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.parent_id ? `— ${f.name}` : f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-file">
              Fichier CSV
            </label>
            <input id="import-file" type="file" accept=".csv,text/csv" onChange={handleFileChange} className="w-full text-sm" />
            {fileName && (
              <p className="mt-1 text-xs text-muted-foreground">
                {fileName} — {rows.length} ligne(s) détectée(s)
              </p>
            )}
          </div>
          {columns.length > 0 && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-column">
                Colonne du fichier à utiliser pour la correspondance
              </label>
              <select
                id="import-column"
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Seules les lignes correspondant à une entité déjà existante pour ce client seront ajoutées à la liste — aucune
            entité n'est créée depuis le fichier.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "…" : "Importer"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
