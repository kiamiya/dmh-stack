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
  created_at: string;
  updated_at: string;
}

export type InteractionType =
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "email_unsubscribed"
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
