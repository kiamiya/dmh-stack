export type ImportEntityType = "contact" | "company";

export interface ImportColumnSample {
  /** Nom de la colonne tel qu'il apparaît dans l'en-tête du CSV. */
  name: string;
  /** Valeurs non vides, dédupliquées et tronquées, échantillonnées dans le fichier. */
  sampleValues: string[];
}

export interface ExistingCustomFieldSummary {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  selectOptions: string[] | null;
}

export interface ImportColumnAnalysisPromptInput {
  entityType: ImportEntityType;
  /** Champs standards déjà associés à une colonne du fichier — juste pour contexte, ne pas les analyser. */
  mappedStandardFields: Array<{ key: string; label: string }>;
  /** Champs personnalisés déjà définis pour ce client et ce type d'entité — à privilégier avant d'en créer un nouveau. */
  existingCustomFields: ExistingCustomFieldSummary[];
  /** Colonnes du fichier qui ne correspondent à aucun champ standard, avec un échantillon de leurs valeurs. */
  columns: ImportColumnSample[];
}

export interface ImportColumnPrompt {
  system: string;
  user: string;
}

export const SYSTEM_PROMPT =
  "Tu es un assistant d'import de données pour un CRM B2B français. Pour " +
  "chaque colonne d'un fichier qui ne correspond à aucun champ standard du " +
  "système, tu proposes la meilleure action : l'ignorer, la rattacher à un " +
  "champ personnalisé déjà existant, ou en créer un nouveau. Tu es concis " +
  "et tu ne proposes jamais de créer un champ personnalisé qui ferait " +
  "doublon avec un champ standard ou un champ personnalisé déjà existant.";

const ENTITY_LABEL: Record<ImportEntityType, string> = {
  contact: "des contacts",
  company: "des entreprises",
};

const FIELD_TYPE_HINT =
  '"text" (texte libre), "number" (nombre), "date" (date), "boolean" (vrai/faux), ' +
  '"select" (liste déroulante à choix unique) ou "multiselect" (choix multiples)';

/**
 * Construit le prompt d'analyse des colonnes non reconnues d'un import CSV.
 * Aucune contrainte de plage numérique ici (ex. sur `confidence`) : le
 * sous-ensemble JSON Schema accepté par `output_config.format` ne supporte
 * pas `minimum`/`maximum` sur un `number` (contrainte découverte avec
 * `packages/scoring`), donc la fourchette 0 à 1 est uniquement décrite en
 * texte.
 */
export function buildImportColumnAnalysisPrompt(
  input: ImportColumnAnalysisPromptInput,
): ImportColumnPrompt {
  const sections: string[] = [];

  sections.push(`Import de ${ENTITY_LABEL[input.entityType]} dans un CRM.`);

  if (input.mappedStandardFields.length > 0) {
    sections.push(
      "Champs standards déjà associés à une colonne du fichier (contexte, ne pas les analyser à nouveau) :\n" +
        input.mappedStandardFields.map((f) => `- ${f.label} (${f.key})`).join("\n"),
    );
  }

  sections.push(
    input.existingCustomFields.length > 0
      ? "Champs personnalisés déjà définis pour ce client sur ce type de fiche (à privilégier via " +
          '"map_existing" si une colonne correspond visiblement à l\'un d\'eux, avant de proposer ' +
          '"create_new") :\n' +
          input.existingCustomFields
            .map(
              (f) =>
                `- id=${f.id} · ${f.label} (clé: ${f.fieldKey}, type: ${f.fieldType}` +
                (f.selectOptions && f.selectOptions.length > 0
                  ? `, options: ${f.selectOptions.join(", ")}`
                  : "") +
                ")",
            )
            .join("\n")
      : "Aucun champ personnalisé n'est encore défini pour ce client sur ce type de fiche.",
  );

  sections.push(
    "Colonnes du fichier ne correspondant à aucun champ standard, avec un échantillon de leurs valeurs :\n" +
      input.columns
        .map(
          (c) =>
            `- "${c.name}" — valeurs observées : ${
              c.sampleValues.length > 0 ? c.sampleValues.map((v) => `"${v}"`).join(", ") : "(aucune)"
            }`,
        )
        .join("\n"),
  );

  sections.push(
    "Pour CHAQUE colonne listée ci-dessus, propose une action :\n" +
      '- "ignore" : la colonne n\'apporte aucune valeur exploitable (identifiant technique, doublon d\'un champ déjà couvert, colonne vide ou inexploitable).\n' +
      '- "map_existing" : la colonne correspond à un champ personnalisé déjà défini ci-dessus — indique alors son id exact dans `existingFieldId`.\n' +
      '- "create_new" : aucun champ existant ne convient — propose un `suggestedLabel` court en français et un `suggestedType` parmi ' +
      FIELD_TYPE_HINT +
      ", déduit du nom de la colonne et de ses valeurs observées.\n" +
      "Indique aussi un `confidence` entre 0 et 1 (0 = incertain, 1 = certain) et une `rationale` d'une phrase en français. " +
      "Ne recommande JAMAIS de créer un champ qui ferait doublon avec un champ standard ou un champ personnalisé déjà listé.",
  );

  sections.push("Réponds avec un objet contenant un tableau `suggestions`, une entrée par colonne analysée.");

  return { system: SYSTEM_PROMPT, user: sections.join("\n\n") };
}
