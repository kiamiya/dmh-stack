/**
 * Construction du prompt de scoring (brief §1.3.5). Les signaux
 * positifs/négatifs listés dans le prompt reprennent exactement ceux du
 * brief. Limite assumée et explicitée dans le prompt : "absence de site
 * web moderne" ne peut être jugée que sur la présence du champ `website`
 * (pas de scraping du contenu réel en Phase 1).
 *
 * Le type de `signals` est dupliqué structurellement ici plutôt
 * qu'importé de "./signals.js" : ce fichier est importé directement par
 * l'Edge Function Deno (score-prospect), qui ne comprend pas le mapping
 * bundler `.js` -> `.ts` pour les imports internes au package (même
 * contournement que `@dmh/claude-messages/src/client.ts`).
 */
export interface ScoringPromptInput {
  companyName: string;
  nafLabel: string | null;
  employeeRange: string | null;
  website: string | null;
  signals: {
    representatives: Array<{ fullName: string; title: string | null; monthsInRole: number | null }>;
    financeHistory: Array<{ year: number; revenue: number | null; growthRate: number | null }>;
  };
}

export const SYSTEM_PROMPT =
  "Tu es un expert en qualification commerciale B2B, spécialisé dans " +
  "l'évaluation de prospects pour des PME industrielles françaises.";

export interface ScoringPrompt {
  system: string;
  user: string;
}

export function buildScoringPrompt(input: ScoringPromptInput): ScoringPrompt {
  const facts: string[] = [];

  facts.push(`Entreprise : ${input.companyName}`);
  if (input.nafLabel) facts.push(`Secteur (NAF) : ${input.nafLabel}`);
  if (input.employeeRange) facts.push(`Effectif : ${input.employeeRange}`);
  facts.push(
    `Site web renseigné : ${input.website ? `oui (${input.website})` : "non"} (jugé uniquement sur la présence du champ, le contenu réel du site n'est pas consulté)`,
  );

  if (input.signals.representatives.length > 0) {
    facts.push("Dirigeants :");
    for (const rep of input.signals.representatives) {
      const title = rep.title ? ` (${rep.title})` : "";
      const tenure = rep.monthsInRole !== null ? `, en poste depuis ${rep.monthsInRole} mois` : "";
      facts.push(`  - ${rep.fullName}${title}${tenure}`);
    }
  }

  if (input.signals.financeHistory.length > 0) {
    facts.push("Chiffre d'affaires par exercice (du plus récent au plus ancien) :");
    for (const fy of input.signals.financeHistory) {
      const revenue = fy.revenue !== null ? `${Math.round(fy.revenue / 1000)} k€` : "non communiqué";
      const growth =
        fy.growthRate !== null ? `, croissance ${fy.growthRate > 0 ? "+" : ""}${fy.growthRate}%` : "";
      facts.push(`  - ${fy.year} : ${revenue}${growth}`);
    }
  }

  const user = `Évalue la pertinence de ce prospect pour une offre de cellule commerciale externalisée B2B (prospection pour PME industrielles françaises), sur une échelle de 1 à 10.

Informations disponibles (issues de Pappers) :
${facts.join("\n")}

Signaux positifs à valoriser :
- Un dirigeant nommé depuis moins de 12 mois (signal le plus fort : période de réévaluation des partenaires).
- Effectif entre 20 et 200 salariés (cœur de cible).
- Secteur industriel à tradition de vente par réseau (sous-traitance mécanique, chaudronnerie, maintenance).
- Chiffre d'affaires stagnant ou en légère baisse sur les 2 derniers exercices (signal de recherche de croissance).
- Absence de site web renseigné (indicateur d'immaturité commerciale générale).

Signaux négatifs à pénaliser :
- Plus de 500 salariés (équipe commerciale interne probable).
- Secteur dépendant des appels d'offres publics (BTP, services publics).
- Chiffre d'affaires en forte croissance (commercialisation déjà efficace).
- Un dirigeant avec un titre de directeur commercial ou directeur des ventes.

Réponds uniquement avec les 2 champs demandés : score (entier de 1 à 10) et justification (2-3 phrases maximum, en français, exploitable directement par un commercial).`;

  return { system: SYSTEM_PROMPT, user };
}
