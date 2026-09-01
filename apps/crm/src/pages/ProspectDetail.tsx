import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Avatar } from "../components/ui/avatar";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "../lib/status";
import { formatScore, getScoreColor } from "../lib/score";
import { formatRelativeTime } from "../lib/relativeTime";
import { getInteractionTypeColor, getInteractionTypeLabel } from "../lib/interactionLabels";
import { useProspectDetail } from "../hooks/useProspectDetail";
import { useInteractions } from "../hooks/useInteractions";
import { useStaffMembers } from "../hooks/useStaffMembers";
import type { ProspectStatus } from "@dmh/types";

function NoteForm({ onSubmit, submitting }: { onSubmit: (content: string) => void; submitting: boolean }) {
  const [content, setContent] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSubmit(content);
        setContent("");
      }}
      className="flex gap-2"
    >
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ajouter une note…"
        className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm"
      />
      <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
        {submitting ? "…" : "Ajouter"}
      </Button>
    </form>
  );
}

export function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    prospect,
    message,
    loading,
    error,
    savingStatus,
    markingReady,
    changeStatus,
    markReadyForSmartlead,
    changeAssignment,
  } = useProspectDetail(id);
  const { interactions, addingNote, addNote } = useInteractions(id, prospect?.client_id);
  const staff = useStaffMembers();

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!prospect) return <div className="p-8 text-sm text-muted-foreground">Prospect introuvable.</div>;

  const company = prospect.companies;
  const contact = prospect.contacts;
  const assignedStaff = staff.find((s) => s.id === prospect.assigned_to);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour aux prospects
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={company?.name ?? "?"} />
          <h1 className="text-lg font-semibold text-foreground">{company?.name ?? "Prospect"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(prospect.status)}>{getStatusLabel(prospect.status)}</Badge>
          <select
            value={prospect.status}
            disabled={savingStatus}
            onChange={(e) => changeStatus(e.target.value as ProspectStatus)}
            className="rounded-md border border-border px-2 py-1 text-sm"
          >
            {ALL_PROSPECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Score IA</span>
                <Badge variant={getScoreColor(company?.ai_score ?? null)}>
                  {formatScore(company?.ai_score ?? null)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {company?.ai_score_reason ?? "Pas encore scoré."}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {!message && <p className="text-muted-foreground">Aucun message généré pour ce prospect.</p>}
              {message && (
                <Tabs defaultValue="email">
                  <TabsList>
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                    <TabsTrigger value="followup">Relance J+7</TabsTrigger>
                  </TabsList>
                  <TabsContent value="email">
                    <div className="font-medium text-foreground">{message.email_subject}</div>
                    <p className="whitespace-pre-wrap text-muted-foreground">{message.email_body}</p>
                  </TabsContent>
                  <TabsContent value="linkedin">
                    <p className="whitespace-pre-wrap text-muted-foreground">{message.linkedin_message}</p>
                  </TabsContent>
                  <TabsContent value="followup">
                    <p className="whitespace-pre-wrap text-muted-foreground">{message.followup_email}</p>
                  </TabsContent>
                  <div className="flex items-center gap-2 pt-3">
                    {message.approved ? (
                      <Badge variant="green">
                        Prêt pour Smartlead
                        {message.injected_at
                          ? ` — ${new Date(message.injected_at).toLocaleDateString("fr-FR")}`
                          : ""}
                      </Badge>
                    ) : (
                      <Button size="sm" disabled={markingReady} onClick={markReadyForSmartlead}>
                        {markingReady ? "…" : "Marquer prêt pour Smartlead"}
                      </Button>
                    )}
                  </div>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NoteForm onSubmit={addNote} submitting={addingNote} />
              <ul className="space-y-2">
                {interactions.map((i) => (
                  <li key={i.id} className="flex items-start gap-2 border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                    <Badge variant={getInteractionTypeColor(i.type)}>{getInteractionTypeLabel(i.type)}</Badge>
                    <div className="min-w-0 flex-1">
                      {i.subject && <div className="font-medium text-foreground">{i.subject}</div>}
                      {i.content && <div className="text-muted-foreground">{i.content}</div>}
                      <div className="text-xs text-muted-foreground">{formatRelativeTime(i.occurred_at)}</div>
                    </div>
                  </li>
                ))}
                {interactions.length === 0 && (
                  <li className="text-sm text-muted-foreground">Aucune interaction pour l'instant.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignation</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={prospect.assigned_to ?? ""}
                onChange={(e) => changeAssignment(e.target.value || null)}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <option value="">Non assigné</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {assignedStaff && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar name={assignedStaff.name} size="sm" />
                  {assignedStaff.name}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <div>SIREN : {company?.siren ?? "—"}</div>
              <div>Forme juridique : {company?.legal_form ?? "—"}</div>
              <div>Secteur : {company?.naf_label ?? "—"}</div>
              <div>Effectif : {company?.employee_range ?? "—"}</div>
              <div>Ville : {company?.city ?? "—"}</div>
              <div>CA : {company?.revenue ? `${Math.round(company.revenue / 1000)} k€` : "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <div>Nom : {contact ? `${contact.first_name} ${contact.last_name}` : "—"}</div>
              <div>Poste : {contact?.job_title ?? "—"}</div>
              <div>
                Email : {contact?.email ?? "—"}
                {contact?.email_confidence ? ` (${contact.email_confidence})` : ""}
              </div>
              <div>LinkedIn : {contact?.linkedin_url ?? "—"}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
