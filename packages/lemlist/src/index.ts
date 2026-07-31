export {
  fetchLemlistActivities,
  fetchAllLemlistActivities,
  LemlistApiError,
} from "./client.js";
export type { LemlistActivity, FetchActivitiesParams, LemlistClientOptions } from "./client.js";

export { mapLemlistActivityToInteraction, mapLemlistActivityToProspectStatus } from "./mapper.js";
export type { LemlistInteractionType, MappedLemlistInteraction } from "./mapper.js";
