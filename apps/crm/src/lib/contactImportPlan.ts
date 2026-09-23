import { extractCustomFieldRawValues } from "./importColumnDecision";
import type { ImportColumnDecision } from "./importColumnDecision";
import { isValidEmail } from "./contactForm";

export interface ContactImportRow {
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string | null;
  email: string | null;
  linkedinUrl: string | null;
}

export interface ContactImportPlanItem {
  /** Numéro de ligne dans le fichier CSV (en-tête = ligne 1). */
  csvLine: number;
  data: ContactImportRow;
  /** Valeur brute (colonne CSV -> valeur) pour chaque colonne non ignorée d'`ImportColumnDecision`. */
  customFieldValues: Record<string, string | null>;
}

export interface ContactImportSkipped {
  csvLine: number;
  reason: string;
  /** Présent si la ligne est écartée pour un email mal formé — corrigeable dans l'interface (S38-2). */
  invalidEmail?: { rowIndex: number; value: string };
}

export interface ContactImportPlan {
  toCreate: ContactImportPlanItem[];
  skipped: ContactImportSkipped[];
}

export interface ContactImportMapping {
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle?: string;
  email?: string;
  linkedinUrl?: string;
}

/**
 * Pure : valide et déduplique les lignes d'un CSV avant import — ne décide
 * jamais d'une écriture en base (voir `services/entityImport.ts` pour
 * l'exécution). Une ligne sans prénom/nom/entreprise est rejetée (jamais
 * créée à moitié) ; un email déjà utilisé (en base ou déjà vu plus tôt dans
 * le même fichier) est rejeté pour éviter un doublon de contact ; un email
 * mal formé est rejeté avec `invalidEmail` pour permettre sa correction
 * directe dans l'interface (S38-2) — la qualité de la donnée reste de la
 * responsabilité de l'utilisateur, rien n'est corrigé automatiquement.
 *
 * `columnDecisions` (agent d'import, colonnes non standard) est optionnel et
 * vide par défaut — comportement inchangé pour un appelant qui ne s'en sert
 * pas.
 */
export function planContactImport(
  rows: Array<Record<string, string>>,
  mapping: ContactImportMapping,
  existingEmails: Set<string>,
  columnDecisions: ImportColumnDecision[] = [],
): ContactImportPlan {
  const toCreate: ContactImportPlanItem[] = [];
  const skipped: ContactImportSkipped[] = [];
  const seenEmails = new Set(existingEmails);

  rows.forEach((row, index) => {
    const csvLine = index + 2;
    const firstName = (row[mapping.firstName] ?? "").trim();
    const lastName = (row[mapping.lastName] ?? "").trim();
    const companyName = (row[mapping.companyName] ?? "").trim();

    if (!firstName || !lastName) {
      skipped.push({ csvLine, reason: "Prénom ou nom manquant" });
      return;
    }
    if (!companyName) {
      skipped.push({ csvLine, reason: "Entreprise manquante" });
      return;
    }

    const rawEmail = mapping.email ? row[mapping.email]?.trim() || null : null;
    if (rawEmail && !isValidEmail(rawEmail)) {
      skipped.push({ csvLine, reason: `Email invalide : "${rawEmail}"`, invalidEmail: { rowIndex: index, value: rawEmail } });
      return;
    }
    const emailKey = rawEmail ? rawEmail.toLowerCase() : null;
    if (emailKey && seenEmails.has(emailKey)) {
      skipped.push({ csvLine, reason: `Email déjà utilisé : "${rawEmail}"` });
      return;
    }
    if (emailKey) seenEmails.add(emailKey);

    toCreate.push({
      csvLine,
      data: {
        firstName,
        lastName,
        companyName,
        jobTitle: mapping.jobTitle ? row[mapping.jobTitle]?.trim() || null : null,
        email: rawEmail,
        linkedinUrl: mapping.linkedinUrl ? row[mapping.linkedinUrl]?.trim() || null : null,
      },
      customFieldValues: extractCustomFieldRawValues(row, columnDecisions),
    });
  });

  return { toCreate, skipped };
}
