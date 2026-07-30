/**
 * Les 4 valeurs autorisées par `contacts.email_confidence`
 * (supabase/migrations/001_initial_schema.sql). Brief §1.2.2/§1.3.1 étape 3 :
 * seules "valid"/"accept" sont injectées dans les campagnes, "risky" est
 * stocké mais pas utilisé, "not_found" laisse le prospect utilisable pour
 * LinkedIn (Lemlist) mais pas pour l'email.
 */
export type EmailConfidence = "valid" | "accept" | "risky" | "not_found";

interface DropcontactEmailEntry {
  email?: string;
  qualification?: string;
}

export interface DropcontactResultEntry {
  email?: DropcontactEmailEntry[];
  [key: string]: unknown;
}

export interface EmailEnrichment {
  email: string | null;
  confidence: EmailConfidence;
}

const CONFIDENCE_ORDER: EmailConfidence[] = ["valid", "accept", "risky", "not_found"];

/**
 * La qualification Dropcontact est au format "local@domaine" (ex.
 * "nominative@pro") — un vocabulaire plus fin que nos 4 valeurs. Mapping
 * assumé en l'absence de spec brief précise sur cette correspondance, à
 * ajuster si l'usage réel montre un taux de bounce trop élevé sur "accept" :
 *  - nominative + pro           -> valid  (email nominatif professionnel, meilleur cas)
 *  - (catch_all|generic) + pro  -> accept (email professionnel plausible, pas garanti nominatif)
 *  - tout le reste (perso, random, invalid...) -> risky
 */
export function mapQualificationToConfidence(
  qualification: string | null | undefined,
): EmailConfidence {
  if (!qualification) return "not_found";

  const [local, domain] = qualification.split("@");
  if (local === "nominative" && domain === "pro") return "valid";
  if ((local === "catch_all" || local === "generic") && domain === "pro") return "accept";
  return "risky";
}

/**
 * Extrait le meilleur email d'un résultat Dropcontact (il peut en renvoyer
 * plusieurs candidats) : priorité valid > accept > risky, `not_found` si
 * aucun email exploitable.
 */
export function extractBestEmail(entry: DropcontactResultEntry): EmailEnrichment {
  const candidates = Array.isArray(entry.email) ? entry.email : [];

  const ranked = candidates
    .filter((e): e is DropcontactEmailEntry & { email: string } => Boolean(e.email))
    .map((e) => ({ email: e.email, confidence: mapQualificationToConfidence(e.qualification) }));

  if (ranked.length === 0) {
    return { email: null, confidence: "not_found" };
  }

  ranked.sort(
    (a, b) => CONFIDENCE_ORDER.indexOf(a.confidence) - CONFIDENCE_ORDER.indexOf(b.confidence),
  );

  return ranked[0];
}
