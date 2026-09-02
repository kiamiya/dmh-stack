export type OfferType = "discovery" | "standard" | "expert";
export type ClientStatus = "active" | "paused" | "cancelled";

export interface DmhClient {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  offer_type: OfferType;
  retainer_amount: number;
  commission_rate: number;
  contract_start_date: string | null;
  status: ClientStatus;
  subdomain: string;
  brand_logo_url: string | null;
  brand_primary_color: string;
  brand_name: string | null;
  /** Description 2-3 phrases de l'offre du client, injectée dans le prompt Claude (brief §1.3.1 étape 4). */
  offer_description: string | null;
  existing_contacts: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  client_id: string;
  name: string;
  siren: string | null;
  naf_code: string | null;
  naf_label: string | null;
  legal_form: string | null;
  employee_range: string | null;
  revenue: number | null;
  revenue_year: number | null;
  city: string | null;
  address: string | null;
  website: string | null;
  creation_date: string | null;
  pappers_data: unknown;
  ai_score: number | null;
  ai_score_reason: string | null;
  created_at: string;
}

export type EmailConfidence = "valid" | "accept" | "risky" | "not_found";
export type ContactDataSource = "pharow" | "dropcontact" | "linkedin" | "manual";

export interface Contact {
  id: string;
  company_id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  email_confidence: EmailConfidence | null;
  linkedin_url: string | null;
  phone: string | null;
  appointment_date: string | null;
  months_in_role: number | null;
  data_source: ContactDataSource | null;
  /** request_id Dropcontact en cours de traitement (API asynchrone), null une fois résolu. */
  dropcontact_request_id: string | null;
  created_at: string;
}

export type ProspectStatus =
  | "to_enrich"
  | "enriched_pappers"
  | "enriched_contact"
  | "ready"
  | "in_sequence"
  | "replied"
  | "meeting_booked"
  | "qualified"
  | "proposal_sent"
  | "won"
  | "lost"
  | "not_interested";

export interface Prospect {
  id: string;
  client_id: string;
  contact_id: string;
  company_id: string;
  status: ProspectStatus;
  smartlead_contact_id: string | null;
  lemlist_contact_id: string | null;
  first_contact_at: string | null;
  last_activity_at: string | null;
  notes: string | null;
  is_existing_contact: boolean;
  /** Membre staff assigné à ce prospect — voir migration 010_add_crm_activity_tracking.sql. */
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export type InteractionType =
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "email_unsubscribed"
  | "email_bounced"
  | "linkedin_request_sent"
  | "linkedin_connected"
  | "linkedin_message_sent"
  | "linkedin_replied"
  | "call"
  | "meeting"
  | "note";

export type InteractionChannel = "email" | "linkedin" | "phone" | "in_person";

export interface Interaction {
  id: string;
  prospect_id: string;
  client_id: string;
  type: InteractionType;
  channel: InteractionChannel;
  subject: string | null;
  content: string | null;
  metadata: unknown;
  occurred_at: string;
  created_at: string;
  /** Membre staff auteur (notes/appels saisis manuellement) — null pour les interactions automatiques (webhooks). Voir migration 010_add_crm_activity_tracking.sql. */
  created_by: string | null;
}

/** Historique des changements de statut d'un prospect — voir migration 010_add_crm_activity_tracking.sql. */
export interface ProspectStatusHistory {
  id: string;
  prospect_id: string;
  client_id: string;
  old_status: ProspectStatus | null;
  new_status: ProspectStatus;
  /** null si le changement vient d'une Edge Function/webhook (service_role) plutôt que d'un staff via le CRM. */
  changed_by: string | null;
  changed_at: string;
}

export interface MessageGenerated {
  id: string;
  prospect_id: string;
  client_id: string;
  email_subject: string | null;
  email_body: string | null;
  linkedin_message: string | null;
  followup_email: string | null;
  model_used: string;
  prompt_version: string | null;
  approved: boolean;
  injected_at: string | null;
  created_at: string;
}

export type DealStatus = "negotiation" | "won" | "lost";

export interface Deal {
  id: string;
  client_id: string;
  prospect_id: string | null;
  /** Relations réelles ajoutées par la migration 013 — "company_name" reste pour compatibilité (dashboard client, script d'attribution) mais une nouvelle Opportunité doit préférer contact_id/company_id. */
  contact_id: string | null;
  company_id: string | null;
  company_name: string;
  deal_value: number;
  status: DealStatus;
  signed_at: string | null;
  first_contact_at: string | null;
  attributed_to_dmh: boolean | null;
  commission_amount: number | null;
  commission_paid: boolean;
  attribution_report: AttributionReport | null;
  created_at: string;
  updated_at: string;
}

/** Relation N:N Contact<->Entreprise (migration 013) — `contacts.company_id` reste l'entreprise "principale" ; cette table ajoute les relations additionnelles. */
export interface ContactCompany {
  id: string;
  client_id: string;
  contact_id: string;
  company_id: string;
  is_primary: boolean;
  role: string | null;
  created_at: string;
}

export type TaskStatus = "to_do" | "in_progress" | "done";

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Champs personnalisés (migration 014) — S9 de la roadmap "parité Brevo". Opportunités pas encore couvertes (arrive en S10). */
export type CustomFieldEntityType = "contact" | "company";
export type CustomFieldType = "text" | "number" | "date" | "boolean" | "select";

export interface CustomFieldDefinition {
  id: string;
  client_id: string;
  entity_type: CustomFieldEntityType;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  select_options: string[] | null;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  client_id: string;
  entity_type: CustomFieldEntityType;
  entity_id: string;
  field_definition_id: string;
  value: string | number | boolean | null;
  created_at: string;
}

export interface AttributionReport {
  first_contact_at: string | null;
  signed_at: string | null;
  months_between: number | null;
  interaction_count: number;
  is_existing_contact: boolean;
  interactions: Array<{
    type: InteractionType;
    occurred_at: string;
    channel: InteractionChannel;
  }>;
}

export interface ProspectScore {
  score: number;
  reason: string;
}

export interface GeneratedMessages {
  email_subject: string;
  email_body: string;
  linkedin_message: string;
  followup_email: string;
}

/** Membre de l'équipe DMH (staff interne) — voir migration 005_add_staff_members.sql. */
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

/** Rattachement d'un utilisateur Supabase Auth à un client (dashboard, S5) — voir migration 007_add_client_users.sql. */
export interface ClientUser {
  id: string;
  client_id: string;
  created_at: string;
}
