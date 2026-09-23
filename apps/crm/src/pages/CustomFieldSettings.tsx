import { useState } from "react";
import type { FormEvent } from "react";
import type { CustomFieldDefinition, CustomFieldEntityType, CustomFieldType } from "@dmh/types";
import { useClients } from "../hooks/useClients";
import { useFieldDefinitions } from "../hooks/useFieldDefinitions";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { PageHeader } from "../components/ui/page-header";
import { useToast } from "../components/ui/toast";
import { EditFieldDefinitionDialog } from "../components/EditFieldDefinitionDialog";
import { supabase } from "../lib/supabase";
import { slugifyFieldKey, validateCustomFieldForm } from "../lib/customFieldForm";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texte",
  number: "Nombre",
  date: "Date",
  boolean: "Case à cocher",
  select: "Liste déroulante",
  multiselect: "Choix multiples (tags)",
};

const ENTITY_TYPE_LABELS: Record<CustomFieldEntityType, string> = {
  contact: "Contacts",
  company: "Entreprises",
  opportunity: "Opportunités",
};

export function CustomFieldSettingsPage() {
  const clients = useClients();
  const [entityType, setEntityType] = useState<CustomFieldEntityType>("contact");
  const [clientId, setClientId] = useState("");
  // S38-6 : avec un client choisi, champs système + champs de ce client, options surchargées pour ce client ;
  // sans client, toutes les définitions brutes.
  const { definitions, create, reload } = useFieldDefinitions(entityType, clientId || null);
  const { toast } = useToast();
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);

  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [selectOptionsRaw, setSelectOptionsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visibleDefinitions = definitions;
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const existingKeys = visibleDefinitions.map((d) => d.field_key);
    const validationError = validateCustomFieldForm({ label, fieldType, selectOptionsRaw, existingKeys });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await create({
        clientId,
        entityType,
        fieldKey: slugifyFieldKey(label),
        label: label.trim(),
        fieldType,
        selectOptions:
          fieldType === "select" || fieldType === "multiselect"
            ? selectOptionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
            : null,
      });
      toast(`Champ "${label.trim()}" ajouté.`, "success");
      setLabel("");
      setSelectOptionsRaw("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader kicker="Données & réglages · propriétés" title="Champs personnalisés" />

      <p className="text-sm text-muted-foreground">
        Les champs <strong className="text-foreground">système</strong> (fiche de prospection : rôle décisionnel,
        niveau de chaleur, source du signal, offres concernées, grille de qualification…) sont communs à tous les
        clients et ne peuvent pas être supprimés. Les champs <strong className="text-foreground">personnalisés</strong>{" "}
        sont propres à un client. Choisis un client pour ne voir que ses champs.
      </p>

      <div className="flex gap-1 border-b border-border">
        {(Object.keys(ENTITY_TYPE_LABELS) as CustomFieldEntityType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setEntityType(type)}
            className={`border-b-2 px-3 py-1.5 text-sm font-medium ${
              entityType === type ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {ENTITY_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un champ pour "{ENTITY_TYPE_LABELS[entityType]}"</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Client DMH…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Libellé du champ"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <input
                value={selectOptionsRaw}
                onChange={(e) => setSelectOptionsRaw(e.target.value)}
                placeholder="Options séparées par des virgules"
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            )}
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-fit sm:col-span-2">
              {submitting ? "…" : "Ajouter le champ"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Clé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Portée</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleDefinitions.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium text-foreground">{d.label}</TableCell>
              <TableCell className="text-muted-foreground">{d.field_key}</TableCell>
              <TableCell>
                <Badge>{FIELD_TYPE_LABELS[d.field_type]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {d.is_system ? <Badge>Système</Badge> : (clientNameById.get(d.client_id ?? "") ?? "—")}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(d)}>
                  Modifier
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {visibleDefinitions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Aucun champ personnalisé pour "{ENTITY_TYPE_LABELS[entityType]}".
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <EditFieldDefinitionDialog
        definition={editing}
        clientId={clientId || null}
        clientName={clientId ? (clientNameById.get(clientId) ?? null) : null}
        onClose={() => setEditing(null)}
        onSaved={() => reload()}
      />
    </div>
  );
}
