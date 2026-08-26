import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "../lib/status";
import { formatScore, getScoreColor } from "../lib/score";
import { useProspectDetail } from "../hooks/useProspectDetail";
import type { ProspectStatus } from "@dmh/types";

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
  } = useProspectDetail(id);

  if (loading) return <div className="p-8 text-sm text-slate-500">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!prospect) return <div className="p-8 text-sm text-slate-500">Prospect introuvable.</div>;

  const company = prospect.companies;
  const contact = prospect.contacts;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← Retour aux prospects
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{company?.name ?? "Prospect"}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(prospect.status)}>{getStatusLabel(prospect.status)}</Badge>
          <select
            value={prospect.status}
            disabled={savingStatus}
            onChange={(e) => changeStatus(e.target.value as ProspectStatus)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {ALL_PROSPECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Score IA</span>
            <Badge variant={getScoreColor(company?.ai_score ?? null)}>
              {formatScore(company?.ai_score ?? null)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {company?.ai_score_reason ?? "Pas encore scoré."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm text-slate-700">
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
        <CardContent className="grid grid-cols-2 gap-2 text-sm text-slate-700">
          <div>Nom : {contact ? `${contact.first_name} ${contact.last_name}` : "—"}</div>
          <div>Poste : {contact?.job_title ?? "—"}</div>
          <div>
            Email : {contact?.email ?? "—"}
            {contact?.email_confidence ? ` (${contact.email_confidence})` : ""}
          </div>
          <div>LinkedIn : {contact?.linkedin_url ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message généré</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {!message && <p className="text-slate-500">Aucun message généré pour ce prospect.</p>}
          {message && (
            <>
              <div>
                <div className="font-medium text-slate-900">Email — {message.email_subject}</div>
                <p className="whitespace-pre-wrap">{message.email_body}</p>
              </div>
              <div>
                <div className="font-medium text-slate-900">LinkedIn</div>
                <p className="whitespace-pre-wrap">{message.linkedin_message}</p>
              </div>
              <div>
                <div className="font-medium text-slate-900">Relance J+7</div>
                <p className="whitespace-pre-wrap">{message.followup_email}</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {message.approved ? (
                  <Badge variant="green">
                    Prêt pour Smartlead
                    {message.injected_at ? ` — ${new Date(message.injected_at).toLocaleDateString("fr-FR")}` : ""}
                  </Badge>
                ) : (
                  <Button size="sm" disabled={markingReady} onClick={markReadyForSmartlead}>
                    {markingReady ? "…" : "Marquer prêt pour Smartlead"}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
