import type { InteractionChannel, InteractionType, ProspectStatus } from "@dmh/types";

/**
 * Données factices pour le mode démo local (`SUPABASE_DEMO_MODE=true`,
 * voir `supabase.ts`) — utilisées uniquement quand le vrai projet Supabase
 * est injoignable (ex. mis en pause). Jamais utilisées en prod, jamais
 * une source de vérité : purement pour naviguer/tester l'UI du CRM.
 */

export interface MockCompany {
  id: string;
  name: string;
  siren: string | null;
  legal_form: string | null;
  naf_label: string | null;
  employee_range: string | null;
  city: string | null;
  revenue: number | null;
  ai_score: number | null;
  ai_score_reason: string | null;
}

export interface MockContact {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  email_confidence: string | null;
  linkedin_url: string | null;
}

export interface MockClient {
  id: string;
  name: string;
}

export interface MockProspect {
  id: string;
  status: ProspectStatus;
  company_id: string;
  contact_id: string;
  client_id: string;
  assigned_to: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockStatusHistory {
  prospect_id: string;
  old_status: ProspectStatus | null;
  new_status: ProspectStatus;
  changed_by: string | null;
  changed_at: string;
}

export interface MockDeal {
  id: string;
  company_name: string;
  deal_value: number;
  status: "negotiation" | "won" | "lost";
  signed_at: string | null;
  attributed_to_dmh: boolean | null;
  commission_amount: number | null;
}

export interface MockStaffMember {
  id: string;
  name: string;
  email: string;
}

export interface MockInteraction {
  id: string;
  prospect_id: string;
  type: InteractionType;
  channel: InteractionChannel;
  subject: string | null;
  content: string | null;
  occurred_at: string;
  created_by: string | null;
}

export interface MockMessage {
  id: string;
  prospect_id: string;
  email_subject: string | null;
  email_body: string | null;
  linkedin_message: string | null;
  followup_email: string | null;
  approved: boolean;
  injected_at: string | null;
  created_at: string;
}

export const mockClients: MockClient[] = [
  { id: "client-1", name: "[DEMO] Cabinet Fictif Conseil" },
];

export const mockCompanies: MockCompany[] = [
  {
    id: "company-1",
    name: "PM Mécanique Industrie (démo)",
    siren: "481838852",
    legal_form: "SAS",
    naf_label: "Mécanique industrielle",
    employee_range: "20-49 salariés",
    city: "Le Creusot",
    revenue: 980000,
    ai_score: 5,
    ai_score_reason:
      "Secteur pertinent et CA stagnant, mais effectif faible et dirigeant en poste depuis longtemps — pas de signal fort de nouveauté.",
  },
  {
    id: "company-2",
    name: "Atelier Ferronnerie du Nord (démo)",
    siren: "512345678",
    legal_form: "SARL",
    naf_label: "Travail des métaux",
    employee_range: "50-99 salariés",
    city: "Lille",
    revenue: 3200000,
    ai_score: 8,
    ai_score_reason:
      "Dirigeant en poste depuis 4 mois, effectif dans la fourchette cible, secteur à vente réseau, CA stagnant — signaux très favorables.",
  },
  {
    id: "company-3",
    name: "Groupe Techno Soudure (démo)",
    siren: "398765432",
    legal_form: "SA",
    naf_label: "Chaudronnerie",
    employee_range: "200-499 salariés",
    city: "Lyon",
    revenue: 42000000,
    ai_score: 2,
    ai_score_reason: "Effectif trop élevé, hors ICP DMH (PME 20-200 salariés).",
  },
  {
    id: "company-4",
    name: "Menuiserie Dubois & Fils (démo)",
    siren: null,
    legal_form: "SARL",
    naf_label: "Menuiserie industrielle",
    employee_range: "10-19 salariés",
    city: "Nantes",
    revenue: null,
    ai_score: null,
    ai_score_reason: null,
  },
];

export const mockContacts: MockContact[] = [
  {
    id: "contact-1",
    first_name: "Frédéric",
    last_name: "Vaysse (démo)",
    job_title: "Gérant",
    email: null,
    email_confidence: null,
    linkedin_url: null,
  },
  {
    id: "contact-2",
    first_name: "Sophie",
    last_name: "Lambert (démo)",
    job_title: "Directrice générale",
    email: "s.lambert@ferronnerie-nord-demo.fr",
    email_confidence: "valid",
    linkedin_url: "https://linkedin.com/in/demo-sophie-lambert",
  },
  {
    id: "contact-3",
    first_name: "Marc",
    last_name: "Petit (démo)",
    job_title: "Directeur commercial",
    email: "m.petit@technosoudure-demo.fr",
    email_confidence: "risky",
    linkedin_url: null,
  },
  {
    id: "contact-4",
    first_name: "Marie",
    last_name: "Dubois (démo)",
    job_title: "Dirigeante",
    email: null,
    email_confidence: null,
    linkedin_url: null,
  },
];

export const mockStaffMembers: MockStaffMember[] = [
  { id: "staff-1", name: "William Demo", email: "demo@dmhassocies.com" },
  { id: "staff-2", name: "Loïc Demo", email: "loic-demo@dmhassocies.com" },
];

export const mockProspects: MockProspect[] = [
  {
    id: "prospect-1",
    status: "ready",
    company_id: "company-1",
    contact_id: "contact-1",
    client_id: "client-1",
    assigned_to: "staff-1",
    last_activity_at: "2026-08-24T09:00:00Z",
    created_at: "2026-08-05T09:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
  },
  {
    id: "prospect-2",
    status: "in_sequence",
    company_id: "company-2",
    contact_id: "contact-2",
    client_id: "client-1",
    assigned_to: null,
    last_activity_at: "2026-08-25T08:00:00Z",
    created_at: "2026-08-12T09:00:00Z",
    updated_at: "2026-08-22T14:30:00Z",
  },
  {
    id: "prospect-3",
    status: "qualified",
    company_id: "company-3",
    contact_id: "contact-3",
    client_id: "client-1",
    assigned_to: "staff-2",
    last_activity_at: "2026-08-10T09:15:00Z",
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-08-24T09:15:00Z",
  },
  {
    id: "prospect-4",
    status: "to_enrich",
    company_id: "company-4",
    contact_id: "contact-4",
    client_id: "client-1",
    assigned_to: null,
    last_activity_at: null,
    created_at: "2026-08-25T16:45:00Z",
    updated_at: "2026-08-25T16:45:00Z",
  },
];

export const mockStatusHistory: MockStatusHistory[] = [
  { prospect_id: "prospect-1", old_status: null, new_status: "to_enrich", changed_by: null, changed_at: "2026-08-05T09:00:00Z" },
  { prospect_id: "prospect-1", old_status: "to_enrich", new_status: "enriched_pappers", changed_by: null, changed_at: "2026-08-06T09:00:00Z" },
  { prospect_id: "prospect-1", old_status: "enriched_pappers", new_status: "enriched_contact", changed_by: null, changed_at: "2026-08-07T09:00:00Z" },
  { prospect_id: "prospect-1", old_status: "enriched_contact", new_status: "ready", changed_by: "staff-1", changed_at: "2026-08-20T10:00:00Z" },
  { prospect_id: "prospect-2", old_status: null, new_status: "to_enrich", changed_by: null, changed_at: "2026-08-12T09:00:00Z" },
  { prospect_id: "prospect-2", old_status: "to_enrich", new_status: "enriched_pappers", changed_by: null, changed_at: "2026-08-13T09:00:00Z" },
  { prospect_id: "prospect-2", old_status: "enriched_pappers", new_status: "enriched_contact", changed_by: null, changed_at: "2026-08-14T09:00:00Z" },
  { prospect_id: "prospect-2", old_status: "enriched_contact", new_status: "ready", changed_by: null, changed_at: "2026-08-15T09:00:00Z" },
  { prospect_id: "prospect-2", old_status: "ready", new_status: "in_sequence", changed_by: null, changed_at: "2026-08-22T14:30:00Z" },
  { prospect_id: "prospect-3", old_status: null, new_status: "to_enrich", changed_by: null, changed_at: "2026-07-20T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "to_enrich", new_status: "enriched_pappers", changed_by: null, changed_at: "2026-07-21T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "enriched_pappers", new_status: "enriched_contact", changed_by: null, changed_at: "2026-07-22T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "enriched_contact", new_status: "ready", changed_by: null, changed_at: "2026-07-25T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "ready", new_status: "in_sequence", changed_by: null, changed_at: "2026-07-28T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "in_sequence", new_status: "replied", changed_by: null, changed_at: "2026-08-02T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "replied", new_status: "meeting_booked", changed_by: null, changed_at: "2026-08-08T09:00:00Z" },
  { prospect_id: "prospect-3", old_status: "meeting_booked", new_status: "qualified", changed_by: "staff-2", changed_at: "2026-08-10T09:15:00Z" },
  { prospect_id: "prospect-4", old_status: null, new_status: "to_enrich", changed_by: null, changed_at: "2026-08-25T16:45:00Z" },
];

export const mockDeals: MockDeal[] = [
  {
    id: "deal-1",
    company_name: "PM Mécanique Industrie (démo)",
    deal_value: 20000,
    status: "won",
    signed_at: "2026-08-15",
    attributed_to_dmh: true,
    commission_amount: 1800,
  },
  {
    id: "deal-2",
    company_name: "Autre Prospect Gagné (démo)",
    deal_value: 12000,
    status: "won",
    signed_at: "2026-07-28",
    attributed_to_dmh: false,
    commission_amount: 0,
  },
  {
    id: "deal-3",
    company_name: "Prospect Perdu (démo)",
    deal_value: 8000,
    status: "lost",
    signed_at: "2026-08-05",
    attributed_to_dmh: null,
    commission_amount: null,
  },
];

export const mockInteractions: MockInteraction[] = [
  {
    id: "interaction-1",
    prospect_id: "prospect-1",
    type: "email_sent",
    channel: "email",
    subject: "Une question sur votre production au Creusot",
    content: null,
    occurred_at: "2026-08-20T10:05:00Z",
    created_by: null,
  },
  {
    id: "interaction-2",
    prospect_id: "prospect-2",
    type: "email_sent",
    channel: "email",
    subject: "Votre développement commercial en réseau",
    content: null,
    occurred_at: "2026-08-22T15:00:00Z",
    created_by: null,
  },
  {
    id: "interaction-3",
    prospect_id: "prospect-2",
    type: "email_replied",
    channel: "email",
    subject: null,
    content: "Réponse du prospect — texte de démo.",
    occurred_at: "2026-08-25T08:00:00Z",
    created_by: null,
  },
  {
    id: "interaction-4",
    prospect_id: "prospect-3",
    type: "note",
    channel: "in_person",
    subject: null,
    content: "Échange rapide au téléphone — texte de démo.",
    occurred_at: "2026-08-10T09:15:00Z",
    created_by: "staff-2",
  },
];

export const mockMessages: MockMessage[] = [
  {
    id: "message-1",
    prospect_id: "prospect-1",
    email_subject: "Une question sur votre production au Creusot",
    email_body:
      "Bonjour Frédéric,\n\nJ'ai vu que PM Mécanique Industrie est implantée au Creusot avec un CA proche du million. [Texte de démo — pas un vrai message généré.]\n\nAuriez-vous 15 minutes cette semaine ?\n\nCordialement.",
    linkedin_message: "Bonjour Frédéric, je vous ai envoyé un email au sujet de votre activité — texte de démo.",
    followup_email:
      "Bonjour Frédéric,\n\nJe me permets de revenir vers vous — texte de relance de démo, pas un vrai message généré.",
    approved: false,
    injected_at: null,
    created_at: "2026-08-20T10:05:00Z",
  },
  {
    id: "message-2",
    prospect_id: "prospect-2",
    email_subject: "Votre développement commercial en réseau",
    email_body: "Bonjour Sophie,\n\n[Texte de démo — message déjà marqué prêt pour Smartlead.]",
    linkedin_message: "Bonjour Sophie — texte de démo.",
    followup_email: "Relance J+7 — texte de démo.",
    approved: true,
    injected_at: "2026-08-22T15:00:00Z",
    created_at: "2026-08-22T14:35:00Z",
  },
];
