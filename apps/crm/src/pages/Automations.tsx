import { useState } from "react";
import type { FormEvent } from "react";
import type { AutomationEntityType, AutomationTriggerType } from "@dmh/types";
import { useClients } from "../hooks/useClients";
import { useAutomationRules } from "../hooks/useAutomationRules";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { supabase } from "../lib/supabase";
import { addAction, addCondition } from "../services/automations";
import { validateAutomationRuleForm } from "../lib/automationForm";
import { summarizeAction, summarizeConditions, summarizeTrigger } from "../lib/automationChain";
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
};

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  record_created: "À la création",
  stage_changed: "Au changement d'étape",
};

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
  const [taskTitle, setTaskTitle] = useState("");
  const [dueInDays, setDueInDays] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setConditions([]);
    setTaskTitle("");
    setDueInDays("");
    setAssignedTo("");
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
    if (!taskTitle.trim()) {
      setError("Le titre de la tâche à créer est requis.");
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

      await addAction(supabase, {
        clientId,
        ruleId: rule.id,
        position: 1,
        actionType: "create_task",
        actionConfig: {
          title: taskTitle.trim(),
          ...(dueInDays.trim() && { due_in_days: Number(dueInDays) }),
          ...(assignedTo && { assigned_to: assignedTo }),
        },
      });

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

                  <ChainBlock label="3 · Action">
                    <span className="block text-xs text-muted-foreground">Créer une tâche</span>
                    <input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Titre de la tâche"
                      className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={dueInDays}
                      onChange={(e) => setDueInDays(e.target.value)}
                      placeholder="Échéance (jours, optionnel)"
                      className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      <option value="">Non assignée</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </ChainBlock>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : "Créer la règle"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {!loading &&
              rules.map((r) => (
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
                      <ChainBlock label="Action">
                        <span className="text-sm text-foreground">{summarizeAction(r.automation_actions)}</span>
                      </ChainBlock>
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
              ))}
            {!loading && rules.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Aucune règle pour ce client.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
