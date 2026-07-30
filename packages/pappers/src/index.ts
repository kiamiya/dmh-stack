export {
  fetchCompanyFromPappers,
  PappersApiError,
} from "./client.js";
export type { PappersLookupParams, PappersClientOptions } from "./client.js";

export { mapPappersCompany, calculateMonthsInRole } from "./mapper.js";
export type { CompanyEnrichmentFields, PappersCompanyResponse } from "./mapper.js";
