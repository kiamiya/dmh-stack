export {
  submitDropcontactBatch,
  pollDropcontactBatch,
  DropcontactApiError,
} from "./client.js";
export type {
  DropcontactContact,
  DropcontactClientOptions,
  DropcontactPollResult,
} from "./client.js";

export { mapQualificationToConfidence, extractBestEmail } from "./mapper.js";
export type { EmailConfidence, EmailEnrichment, DropcontactResultEntry } from "./mapper.js";
