/**
 * Construction du prompt de génération de message (brief §1.3.1 étape 4).
 * Persona + contraintes de format viennent directement du brief ; le
 * "months_in_role" est calculé en amont (voir `@dmh/pappers`
 * `calculateMonthsInRole`) à partir de `contacts.appointment_date` — cette
 * dernière n'est pour l'instant jamais renseignée par le pipeline
 * d'enrichissement (voir PROGRESS.md, "Incertitudes techniques"), donc ce
 * champ sera `null` pour tous les prospects tant que ce n'est pas câblé.
 */
export interface MessagePromptInput {
  companyName: string;
  legalForm: string | null;
  nafLabel: string | null;
  employeeRange: string | null;
  city: string | null;
  revenue: number | null;
  contactFirstName: string;
  contactLastName: string;
  jobTitle: string | null;
  monthsInRole: number | null;
  dmhClientName: string;
  dmhClientOfferDescription: string;
}

export const SYSTEM_PROMPT =
  "Tu es un expert en développement commercial B2B français, spécialisé " +
  "dans les PME industrielles. Tu rédiges des messages de prospection " +
  "courts, pertinents et naturels qui ne ressemblent jamais à des " +
  "templates génériques.";

export interface MessagePrompt {
  system: string;
  user: string;
}

export function buildMessagePrompt(input: MessagePromptInput): MessagePrompt {
  const facts: string[] = [];

  facts.push(
    `Entreprise : ${input.companyName}${input.legalForm ? ` (${input.legalForm})` : ""}`,
  );
  if (input.nafLabel) facts.push(`Secteur : ${input.nafLabel}`);
  if (input.employeeRange) facts.push(`Effectif : ${input.employeeRange}`);
  if (input.city) facts.push(`Ville : ${input.city}`);
  if (input.revenue) {
    facts.push(`Chiffre d'affaires : ${Math.round(input.revenue / 1000)} k€`);
  }
  facts.push(
    `Contact : ${input.contactFirstName} ${input.contactLastName}` +
      (input.jobTitle ? `, ${input.jobTitle}` : ""),
  );
  if (input.monthsInRole !== null) {
    facts.push(`En poste depuis ${input.monthsInRole} mois`);
  }

  const user = `Rédige un message de prospection B2B pour ce prospect, au nom de ${input.dmhClientName}.

Offre de ${input.dmhClientName} : ${input.dmhClientOfferDescription}

Informations sur le prospect :
${facts.map((f) => `- ${f}`).join("\n")}

Contraintes strictes :
- 3 à 4 phrases maximum pour l'email.
- Aucune formule de politesse générique ("J'espère que vous allez bien" est interdit).
- Au moins une référence concrète et spécifique à l'entreprise (secteur, taille, localisation, ou ancienneté du dirigeant).
- Un appel à l'action clair et non agressif en dernière phrase.
- Le message LinkedIn doit faire entre 150 et 200 caractères.
- La relance J+7 doit avoir un angle différent de l'email initial (pas juste une reformulation).

Réponds uniquement avec les 4 champs demandés : email_subject, email_body, linkedin_message, followup_email.`;

  return { system: SYSTEM_PROMPT, user };
}
