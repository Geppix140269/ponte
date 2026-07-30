/**
 * Does a Structure & Submit draft hold work a member would be sorry to lose?
 *
 * The brief is careful about this: the unsaved-changes dialog must appear only
 * when leaving would genuinely destroy entered information, never as a reflex.
 * The family and intent the member picked on the way in are one tap and are not
 * counted here; everything they built ON TOP of that entrance is.
 *
 * Pure and import-light so it is unit-tested standalone under tsx, on the same
 * terms as the draft model it reads.
 */

import type { StructureDraft } from "../structure/draft";
import { serviceTermsStated, distributionTermsStated } from "../structure/procedures/types";

const filled = (v: unknown): boolean =>
  v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");

export function structureDirty(draft: StructureDraft): boolean {
  return (
    filled(draft.product) ||
    filled(draft.hsCode) ||
    filled(draft.serviceCategory) ||
    draft.serviceSubcategories.length > 0 ||
    filled(draft.distributionPartnerType) ||
    draft.distributionRelationshipTerms.length > 0 ||
    filled(draft.coverageScope) ||
    draft.territoryCodes.length > 0 ||
    filled(draft.productSector) ||
    filled(draft.customCategoryLabel) ||
    filled(draft.additionalDetails) ||
    filled(draft.quantityMode) ||
    filled(draft.quantity) ||
    filled(draft.quantityMin) ||
    filled(draft.quantityMax) ||
    filled(draft.unit) ||
    filled(draft.frequency) ||
    filled(draft.origin) ||
    filled(draft.destination) ||
    filled(draft.incoterm) ||
    filled(draft.payment) ||
    filled(draft.validity) ||
    filled(draft.role) ||
    filled(draft.note) ||
    draft.declarationAccepted ||
    draft.resolution !== null ||
    filled(draft.documentName) ||
    serviceTermsStated(draft.serviceTerms) ||
    distributionTermsStated(draft.distributionTerms)
  );
}
