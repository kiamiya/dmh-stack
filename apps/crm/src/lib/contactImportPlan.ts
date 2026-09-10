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
}

export interface ContactImportSkipped {
  csvLine: number;
  reason: string;
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
 * le même fichier) est rejeté pour éviter un doublon de contact.
 */
export function planContactImport(
  rows: Array<Record<string, string>>,
  mapping: ContactImportMapping,
  existingEmails: Set<string>,
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
    });
  });

  return { toCreate, skipped };
}
