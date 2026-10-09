// S39-10 — configuration d'un formulaire (CR du 09/10/2026) : liste
// ordonnée de champs, soit standards (contrôlés : e-mail sans espace,
// téléphone avec pays et format), soit champs personnalisés du CRM qui
// alimentent directement la fiche contact.
//
// Module autonome (aucun import de valeur entre fichiers voisins), importable
// tel quel par les Edge Functions Deno.

export type StandardFieldKey = "email" | "first_name" | "last_name" | "phone" | "company" | "job_title" | "message";

export interface StandardFormField {
  id: string;
  kind: "standard";
  key: StandardFieldKey;
  label: string;
  required: boolean;
}

export interface CustomFormField {
  id: string;
  kind: "custom";
  /** `custom_field_definitions.id` (entité contact). */
  fieldDefinitionId: string;
  label: string;
  required: boolean;
}

export type FormField = StandardFormField | CustomFormField;

export const STANDARD_FIELDS: Array<{ key: StandardFieldKey; label: string }> = [
  { key: "email", label: "E-mail" },
  { key: "first_name", label: "Prénom" },
  { key: "last_name", label: "Nom" },
  { key: "phone", label: "Téléphone" },
  { key: "company", label: "Société" },
  { key: "job_title", label: "Fonction" },
  { key: "message", label: "Message" },
];

const STANDARD_KEYS = STANDARD_FIELDS.map((f) => f.key);

/** Champs proposés à la création d'un formulaire. */
export function defaultFormFields(): FormField[] {
  return [
    { id: "email", kind: "standard", key: "email", label: "E-mail", required: true },
    { id: "first_name", kind: "standard", key: "first_name", label: "Prénom", required: true },
    { id: "last_name", kind: "standard", key: "last_name", label: "Nom", required: true },
    { id: "company", kind: "standard", key: "company", label: "Société", required: false },
    { id: "phone", kind: "standard", key: "phone", label: "Téléphone", required: false },
    { id: "message", kind: "standard", key: "message", label: "Message", required: false },
  ];
}

/**
 * Pure : champs valides uniquement (ids uniques, libellé non vide, champ
 * standard connu et présent une seule fois). L'e-mail est indispensable
 * pour rattacher la réponse à un contact : il est ajouté en tête s'il
 * manque, et toujours obligatoire.
 */
export function normalizeFormFields(raw: unknown): FormField[] {
  const fields: FormField[] = [];
  const ids = new Set<string>();
  const standardSeen = new Set<StandardFieldKey>();
  const customSeen = new Set<string>();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = typeof f.id === "string" ? f.id.trim() : "";
    const label = typeof f.label === "string" ? f.label.trim() : "";
    if (!id || !label || ids.has(id)) continue;
    const required = f.required === true;
    if (f.kind === "standard" && STANDARD_KEYS.includes(f.key as StandardFieldKey) && !standardSeen.has(f.key as StandardFieldKey)) {
      const key = f.key as StandardFieldKey;
      standardSeen.add(key);
      ids.add(id);
      fields.push({ id, kind: "standard", key, label, required: key === "email" ? true : required });
    } else if (f.kind === "custom" && typeof f.fieldDefinitionId === "string" && f.fieldDefinitionId && !customSeen.has(f.fieldDefinitionId)) {
      customSeen.add(f.fieldDefinitionId);
      ids.add(id);
      fields.push({ id, kind: "custom", fieldDefinitionId: f.fieldDefinitionId, label, required });
    }
  }
  if (!standardSeen.has("email")) {
    fields.unshift({ id: ids.has("email") ? `email-${fields.length}` : "email", kind: "standard", key: "email", label: "E-mail", required: true });
  }
  return fields;
}

/** Pure : code d'intégration iframe d'un formulaire. */
export function iframeEmbedCode(formUrl: string, title: string): string {
  const safeTitle = title.replace(/"/g, "&quot;");
  return `<iframe src="${formUrl}?embed=1" title="${safeTitle}" style="width:100%;border:0;min-height:480px" loading="lazy"></iframe>`;
}

/**
 * Pure : « capsule HTML » — iframe qui s'ajuste à la hauteur du formulaire
 * (la page du formulaire publie sa hauteur via postMessage).
 */
export function autoResizeEmbedCode(formUrl: string, title: string, slug: string): string {
  const origin = new URL(formUrl).origin;
  const id = `dmh-form-${slug}`;
  return `${iframeEmbedCode(formUrl, title).replace("<iframe ", `<iframe id="${id}" `)}
<script>
window.addEventListener("message", function (e) {
  if (e.origin !== "${origin}" || !e.data || e.data.type !== "dmh-form-height" || e.data.slug !== "${slug}") return;
  var frame = document.getElementById("${id}");
  if (frame) frame.style.height = e.data.height + "px";
});
</script>`;
}
