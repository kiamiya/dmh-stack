export { verifySmartleadSignature } from "./signature.js";

export {
  mapSmartleadEventToInteraction,
  mapLeadCategoryToProspectStatus,
  shouldAdvanceStatus,
} from "./mapper.js";
export type {
  SmartleadWebhookPayload,
  SmartleadInteractionType,
  MappedInteraction,
  MappedProspectStatus,
  AnyProspectStatus,
} from "./mapper.js";
