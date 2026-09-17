import type { CustomFieldEntityType, CustomFieldType } from "@dmh/types";

export interface ProspectingTemplateField {
  entityType: CustomFieldEntityType;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  selectOptions?: string[];
}

/**
 * Champs personnalisés du gabarit générique de fiche de prospection envoyé
 * par Delphine le 17/09/2026 (`Fiche_CRM_Generique_pour_Loic.docx`, généré
 * via Claude à partir du dataset ARIA) — seuls les blocs sans équivalent
 * déjà en base (voir PROGRESS.md, S36-N) : identification entreprise,
 * interlocuteur, historique et prochaine action sont déjà couverts par
 * `companies`/`contacts`/`interactions`/`tasks`. Le bloc "Statut du compte"
 * (Client DMH direct / rattaché à un compte prescripteur) est explicitement
 * exclu — il recoupe l'architecture clients DMH/finaux (Phase G), bloquée
 * sur William (voir S34-10/S34-17), pas un simple champ personnalisé.
 *
 * Les libellés d'options ("Offre 1", "Critère 1 — à définir", ...) sont
 * volontairement génériques, comme dans le gabarit source — à éditer par
 * client via `/settings` une fois les offres/critères réels connus.
 */
export const PROSPECTING_TEMPLATE_FIELDS: ProspectingTemplateField[] = [
  {
    entityType: "contact",
    fieldKey: "role_decisionnel",
    label: "Rôle décisionnel",
    fieldType: "select",
    selectOptions: ["Décideur", "Influenceur", "Filtrant"],
  },
  {
    entityType: "company",
    fieldKey: "niveau_de_chaleur",
    label: "Niveau de chaleur",
    fieldType: "select",
    selectOptions: ["COLD", "WARM", "HOT"],
  },
  {
    entityType: "company",
    fieldKey: "source_du_signal",
    label: "Source du signal",
    fieldType: "select",
    selectOptions: ["Fichier prescripteur", "Salon", "Recommandation", "Inbound", "Autre"],
  },
  {
    entityType: "company",
    fieldKey: "reference_tracable",
    label: "Référence traçable",
    fieldType: "text",
  },
  {
    entityType: "company",
    fieldKey: "date_du_signal",
    label: "Date du signal",
    fieldType: "date",
  },
  {
    entityType: "company",
    fieldKey: "offres_concernees",
    label: "Offres concernées",
    fieldType: "multiselect",
    selectOptions: ["Offre 1", "Offre 2", "Offre 3", "Offre 4", "Autre"],
  },
  {
    entityType: "company",
    fieldKey: "grille_de_qualification",
    label: "Grille de qualification",
    fieldType: "multiselect",
    selectOptions: [
      "Critère 1 — à définir",
      "Critère 2 — à définir",
      "Critère 3 — à définir",
      "Critère 4 — à définir",
    ],
  },
  {
    entityType: "company",
    fieldKey: "besoins_et_angle_accroche",
    label: "Besoins probables et angle d'accroche",
    fieldType: "text",
  },
];
