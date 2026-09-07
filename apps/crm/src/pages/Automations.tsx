import { useState } from "react";
import type { FormEvent } from "react";
import type { AutomationActionBranch, AutomationActionType, AutomationEntityType, AutomationTriggerType } from "@dmh/types";
import { useClients } from "../hooks/useClients";
import { useAutomationRules } from "../hooks/useAutomationRules";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { supabase } from "../lib/supabase";
import { addAction, addCondition, type ActionInsert } from "../services/automations";
import { validateAutomationRuleForm } from "../lib/automationForm";
import { splitActionsByBranch, summarizeAction, summarizeConditions, summarizeTrigger } from "../lib/automationChain";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";
import { ConditionRowsEditor } from "../components/ConditionRowsEditor";
import type { ConditionDraft } from "../components/ConditionRowsEditor";
import { PageHeader } from "../components/ui/page-header";

const ENTITY_LABELS: Record<AutomationEntityType, string> = {
  contact: "Contact",
  company: "Entreprise",
  opportunity: "Opportunité",
  task: "Tâche",
  prospect: "Prospect",
};

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  record_created: "À la création",
  stage_changed: "Au changement d'étape",
};

/** Ébauche d'action côté formulaire — traduite en `ActionInsert` (branche + payload) à la soumission. `trigger_enrichment` n'a d'effet réel côté moteur que pour l'entité `prospect` (migration 030), donc masqué ailleurs. */
interface ActionDraft {
  actionType: AutomationActionType;
  taskTitle: string;
  dueInDays: string;
  assignedTo: string;
  provider: "pappers" | "dropcontact";
}

const EMPTY_ACTION: ActionDraft = { actionType: "create_task", taskTitle: "", dueInDays: "", assignedTo: "", provider: "pappers" };

/** Pure : une action d'ébauche est prête à être envoyée si elle a de quoi produire un `action_config` valide côté moteur. */
function actionIsReady(action: ActionDraft): boolean {
  return action.actionType === "trigger_enrichment" || action.taskTitle.trim().length > 0;
}

function actionInsertFor(action: ActionDraft, branch: AutomationActionBranch, position: number, clientId: string, ruleId: string): ActionInsert {
  if (action.actionType === "trigger_enrichment") {
    return { clientId, ruleId, position, branch, actionType: "trigger_enrichment", actionConfig: { provider: action.provider } };
  }
  return {
    clientId,
    ruleId,
    position,
    branch,
    actionType: "create_task",
    actionConfig: {
      title: action.taskTitle.trim(),
      ...(action.dueInDays.trim() && { due_in_days: Number(action.dueInDays) }),
      ...(action.assignedTo && { assigned_to: action.assignedTo }),
    },
  };
}

function ActionFieldsEditor({
  value,
  onChange,
  allowEnrichment,
  staff,
}: {
  value: ActionDraft;
  onChange: (v: ActionDraft) => void;
  allowEnrichment: boolean;
  staff: Array<{ id: string; name: string }>;
}) {
  return (
    <>
      <select
        value={value.actionType}
        onChange={(e) => onChange({ ...value, actionType: e.target.value as AutomationActionType })}
        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
      >
        <option value="create_task">Créer une tâche</option>
        {allowEnrichment && <option value="trigger_enrichment">Enrichir</option>}
      </select>
      {value.actionType === "create_task" ? (
        <>
          <input
            value={value.taskTitle}
            onChange={(e) => onChange({ ...value, taskTitle: e.target.value })}
            placeholder="Titre de la tâche"
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={value.dueInDays}
            onChange={(e) => onChange({ ...value, dueInDays: e.target.value })}
            placeholder="Échéance (jours, optionnel)"
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
          />
          <select
            value={value.assignedTo}
            onChange={(e) => onChange({ ...value, assignedTo: e.target.value })}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
          >
            <option value="">Non assignée</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <select
          value={value.provider}
          onChange={(e) => onChange({ ...value, provider: e.target.value as ActionDraft["provider"] })}
          className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
        >
          <option value="pappers">Pappers</option>
          <option value="dropcontact">Dropcontact</option>
        </select>
      )}
    </>
  );
}

/** Bloc de la chaîne visuelle (déclencheur/conditions/action) — même carte que le reste du design "Relais", juste un habillage : pilote exactement le même formulaire/schéma qu'avant (S12), pas un nouveau moteur. */
function ChainBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-1.5 border border-border p-3">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ChainArrow() {
  return <div className="hidden shrink-0 self-center px-1 font-heading text-lg text-muted-foreground sm:block">→</div>;
}

export function AutomationsPage() {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const { rules, loading, create, toggle, remove } = useAutomationRules(clientId);
  const { stages } = usePipelineStages(clientId);
  const staff = useStaffMembers();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<AutomationEntityType>("opportunity");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("stage_changed");
  const [toStageId, setToStageId] = useState("");
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [useBranches, setUseBranches] = useState(false);
  const [action, setAction] = useState<ActionDraft>(EMPTY_ACTION);
  const [ifTrueAction, setIfTrueAction] = useState<ActionDraft>(EMPTY_ACTION);
  const [ifFalseAction, setIfFalseAction] = useState<ActionDraft>(EMPTY_ACTION);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allowEnrichment = entityType === "prospect";

  function reset() {
    setName("");
    setConditions([]);
    setUseBranches(false);
    setAction(EMPTY_ACTION);
    setIfTrueAction(EMPTY_ACTION);
    setIfFalseAction(EMPTY_ACTION);
    setToStageId("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateAutomationRuleForm({ name, entityType, triggerType });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }
    if (!useBranches && !actionIsReady(action)) {
      setError("Le titre de la tâche à créer est requis.");
      return;
    }
    if (useBranches && !actionIsReady(ifTrueAction) && !actionIsReady(ifFalseAction)) {
      setError("Au moins une action (branche Oui ou Non) est requise.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const rule = await create({
        clientId,
        name: name.trim(),
        entityType,
        triggerType,
        triggerConfig: triggerType === "stage_changed" && toStageId ? { to_stage_id: toStageId } : {},
      });

      for (const cond of conditions) {
        if (!cond.field.trim()) continue;
        await addCondition(supabase, {
          clientId,
          ruleId: rule.id,
          field: cond.field.trim(),
          operator: cond.operator,
          value: cond.operator === "is_set" ? true : cond.value,
        });
      }

      if (useBranches) {
        if (actionIsReady(ifTrueAction)) {
          await addAction(supabase, actionInsertFor(ifTrueAction, "if_true", 1, clientId, rule.id));
        }
        if (actionIsReady(ifFalseAction)) {
          await addAction(supabase, actionInsertFor(ifFalseAction, "if_false", 1, clientId, rule.id));
        }
      } else {
        await addAction(supabase, actionInsertFor(action, "always", 1, clientId, rule.id));
      }

      toast(`Règle "${name.trim()}" créée.`, "success");
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <PageHeader kicker="Marketing · règles automatiques" title="Automatisations" />

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="">Choisir un client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {clientId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une règle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de la règle"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />

                <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch">
                  <ChainBlock label="1 · Déclencheur">
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value as AutomationEntityType)}
                      className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      {(Object.keys(ENTITY_LABELS) as AutomationEntityType[]).map((t) => (
                        <option key={t} value={t}>
                          {ENTITY_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
                      className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      <option value="record_created">{TRIGGER_LABELS.record_created}</option>
                      <option value="stage_changed" disabled={entityType !== "opportunity"}>
                        {TRIGGER_LABELS.stage_changed}
                      </option>
                    </select>
                    {triggerType === "stage_changed" && entityType === "opportunity" && (
                      <select
                        value={toStageId}
                        onChange={(e) => setToStageId(e.target.value)}
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                      >
                        <option value="">Vers n'importe quelle étape</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            Vers "{s.name}"
                          </option>
                        ))}
                      </select>
                    )}
                  </ChainBlock>

                  <ChainArrow />

                  <ChainBlock label="2 · Conditions">
                    <ConditionRowsEditor conditions={conditions} onChange={setConditions} label="Toutes doivent être vraies" />
                  </ChainBlock>

                  <ChainArrow />

                  {!useBranches ? (
                    <ChainBlock label="3 · Action">
                      <ActionFieldsEditor value={action} onChange={setAction} allowEnrichment={allowEnrichment} staff={staff} />
                    </ChainBlock>
                  ) : (
                    <div className="flex flex-1 flex-col gap-0 sm:flex-row sm:items-stretch">
                      <ChainBlock label="3 · Action si Oui">
                        <ActionFieldsEditor value={ifTrueAction} onChange={setIfTrueAction} allowEnrichment={allowEnrichment} staff={staff} />
                      </ChainBlock>
                      <ChainArrow />
                      <ChainBlock label="3 · Action si Non">
                        <ActionFieldsEditor value={ifFalseAction} onChange={setIfFalseAction} allowEnrichment={allowEnrichment} staff={staff} />
                      </ChainBlock>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={useBranches} onChange={(e) => setUseBranches(e.target.checked)} />
                  Brancher l'action selon les conditions (Oui / Non) plutôt qu'une action unique
                </label>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : "Créer la règle"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {!loading &&
              rules.map((r) => {
                const { always, ifTrue, ifFalse } = splitActionsByBranch(r.automation_actions);
                const hasBranches = ifTrue.length > 0 || ifFalse.length > 0;
                return (
                  <Card key={r.id}>
                    <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                      <div className="flex flex-1 flex-col gap-0 sm:flex-row sm:items-stretch">
                        <ChainBlock label={ENTITY_LABELS[r.entity_type]}>
                          <span className="text-sm text-foreground">{summarizeTrigger(r.trigger_type)}</span>
                        </ChainBlock>
                        <ChainArrow />
                        <ChainBlock label="Conditions">
                          <span className="text-sm text-foreground">{summarizeConditions(r.automation_conditions)}</span>
                        </ChainBlock>
                        <ChainArrow />
                        {hasBranches ? (
                          <>
                            <ChainBlock label="Si Oui">
                              <span className="text-sm text-foreground">{summarizeAction(ifTrue)}</span>
                            </ChainBlock>
                            <ChainArrow />
                            <ChainBlock label="Si Non">
                              <span className="text-sm text-foreground">{summarizeAction(ifFalse)}</span>
                            </ChainBlock>
                          </>
                        ) : (
                          <ChainBlock label="Action">
                            <span className="text-sm text-foreground">{summarizeAction(always)}</span>
                          </ChainBlock>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                        <span className="text-xs font-medium text-muted-foreground">{r.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.enabled ? "green" : "default"}>{r.enabled ? "Active" : "Désactivée"}</Badge>
                          <input type="checkbox" checked={r.enabled} onChange={(e) => toggle(r.id, e.target.checked)} />
                          <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            {!loading && rules.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Aucune règle pour ce client.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
