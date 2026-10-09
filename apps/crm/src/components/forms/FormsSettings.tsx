import { useCallback, useEffect, useState } from "react";
import { autoResizeEmbedCode, defaultFormFields, iframeEmbedCode } from "@dmh/forms";
import type { Form } from "@dmh/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";
import { FormEditorDialog } from "./FormEditorDialog";
import { FormSubmissionsPanel } from "./FormSubmissionsPanel";
import { supabase } from "../../lib/supabase";
import { useSelectedClient } from "../../lib/selectedClient";
import { useFieldDefinitions } from "../../hooks/useFieldDefinitions";
import { DEFAULT_CONSENT_TEXT, formToEditor, publicFormUrl } from "../../lib/formEditor";
import type { FormEditorValues, FormPayload } from "../../lib/formEditor";
import { deleteForm, listForms, saveForm } from "../../services/forms";

function emptyForm(): FormEditorValues {
  return {
    name: "",
    slug: "",
    title: "",
    description: "",
    fields: defaultFormFields(),
    submitLabel: "Envoyer",
    successMessage: "Merci, votre message a bien été envoyé.",
    redirectUrl: "",
    consentText: DEFAULT_CONSENT_TEXT,
    active: true,
  };
}

/** S39-10/11 — formulaires du client choisi dans l'en-tête : création, lien public, codes d'intégration, réponses. */
export function FormsSettings() {
  const { clientId } = useSelectedClient();
  const { toast } = useToast();
  const { definitions } = useFieldDefinitions("contact", clientId || null);
  const [forms, setForms] = useState<Form[]>([]);
  const [editing, setEditing] = useState<{ form: Form | null } | null>(null);
  const [openSubmissions, setOpenSubmissions] = useState<string | null>(null);
  const [openEmbed, setOpenEmbed] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!clientId) return;
    listForms(supabase, clientId)
      .then(setForms)
      .catch((err) => toast(`Chargement impossible : ${(err as Error).message}`, "destructive"));
  }, [clientId, toast]);

  useEffect(load, [load]);

  if (!clientId) return <p className="text-sm text-muted-foreground">Choisis un client dans l'en-tête pour gérer ses formulaires.</p>;

  async function handleSave(payload: FormPayload) {
    await saveForm(supabase, clientId, payload, editing?.form?.id);
    setEditing(null);
    toast("Formulaire enregistré.", "success");
    load();
  }

  async function handleDelete(form: Form) {
    if (!window.confirm(`Supprimer le formulaire « ${form.name} » et ses réponses ? Les fiches contacts créées sont conservées.`)) return;
    try {
      await deleteForm(supabase, form.id);
      load();
    } catch (err) {
      toast((err as Error).message, "destructive");
    }
  }

  function copy(text: string, what: string) {
    void navigator.clipboard?.writeText(text);
    toast(`${what} copié.`, "success");
  }

  const origin = window.location.origin;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Les réponses créent ou complètent la fiche contact (retrouvée par e-mail).</p>
        <Button type="button" size="sm" onClick={() => setEditing({ form: null })}>
          + Nouveau formulaire
        </Button>
      </div>
      {forms.length === 0 && <p className="text-sm text-muted-foreground">Aucun formulaire pour ce client.</p>}
      {forms.map((f) => {
        const url = publicFormUrl(origin, f.slug);
        return (
          <Card key={f.id}>
            <CardContent className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{f.name}</span>
                  {!f.active && <Badge>Hors ligne</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => copy(url, "Lien")}>
                    Copier le lien
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenEmbed(openEmbed === f.id ? null : f.id)}>
                    Intégrer
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenSubmissions(openSubmissions === f.id ? null : f.id)}>
                    Réponses
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ form: f })}>
                    Modifier
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(f)}>
                    Supprimer
                  </Button>
                </div>
              </div>
              <p className="break-all text-xs text-muted-foreground">{url}</p>
              {openEmbed === f.id && (
                <div className="space-y-2">
                  {[
                    { label: "Iframe", code: iframeEmbedCode(url, f.title) },
                    { label: "Capsule HTML (hauteur automatique)", code: autoResizeEmbedCode(url, f.title, f.slug) },
                  ].map((e) => (
                    <div key={e.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{e.label}</span>
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => copy(e.code, "Code")}>
                          Copier
                        </button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-secondary p-2 text-[11px] text-foreground">{e.code}</pre>
                    </div>
                  ))}
                </div>
              )}
              {openSubmissions === f.id && <FormSubmissionsPanel form={f} />}
            </CardContent>
          </Card>
        );
      })}

      {editing && (
        <FormEditorDialog
          title={editing.form ? `Modifier « ${editing.form.name} »` : "Nouveau formulaire"}
          initial={editing.form ? formToEditor(editing.form) : emptyForm()}
          customDefinitions={definitions}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
