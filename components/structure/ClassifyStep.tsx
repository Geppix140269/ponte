"use client";

import { useMemo, useState } from "react";
import CountryPicker from "@/components/CountryPicker";
import { COUNTRIES } from "@/lib/countries";
import type { CategoryIconMap } from "@/components/ponte/category/CategoryIcons";
import {
  TradeServiceCategoryPicker,
  TradeServiceSubcategoryPicker,
  DistributionPartnerTypePicker,
  DistributionRelationshipPicker,
  DistributionCoveragePicker,
  ProductSectorPicker,
} from "@/components/ponte/category/pickers";
import {
  serviceCategory,
  serviceSubcategory,
  serviceCategoryNeedsCustomLabel,
} from "@/lib/taxonomy/services";
import {
  partnerType,
  relationshipTerm,
  coverageScope,
  coverageScopeTakesCountries,
  partnerTypeNeedsCustomLabel,
} from "@/lib/taxonomy/distribution";
import { journeyFor, type ClassificationStep } from "@/lib/taxonomy/journey";
import { PRODUCT_SECTORS } from "@/lib/taxonomy/market";
import {
  classificationComplete,
  stepAnswered,
  needsCustomLabel,
  type StructureDraft,
} from "@/lib/structure/draft";

/**
 * What the record is, chosen before anything is described.
 *
 * This replaces the single blank line that used to open the Trade Services and
 * Distribution journeys. That box asked a member to state their opportunity in
 * one sentence, which meant guessing Ponte's vocabulary, describing the same
 * service five different ways across five records, and leaving nothing that
 * could be filtered, matched or counted afterwards. Products already had a
 * progressive category journey; these two now have one too, in their own
 * vocabulary rather than a borrowed classification.
 *
 * Three rules hold across every branch:
 *
 *   1. The first substantive question is always a set of clickable options.
 *      `lib/taxonomy/journey.ts` decides which one, and no branch here can
 *      open on a text field.
 *   2. Free text appears only after Other, or in the optional details step at
 *      the end. Choosing a recognised category is a complete answer, and
 *      Continue never waits for a sentence on top of it.
 *   3. Nothing already chosen is lost by going back. The trail shows every
 *      answer with a way into it, and returning to an earlier question leaves
 *      the later ones intact.
 */

type T = (key: string, values?: Record<string, string | number>) => string;

export default function ClassifyStep({
  draft,
  set,
  icons,
  onNext,
  t,
}: {
  draft: StructureDraft;
  set: (patch: Partial<StructureDraft>) => void;
  icons: CategoryIconMap;
  onNext: () => void;
  t: T;
}) {
  const journey = journeyFor(
    draft.canonical?.family as "products" | "services" | "distribution",
    draft.canonical?.intent,
  );
  /**
   * The questions this particular draft is actually asked.
   *
   * `product_classification` is the composer's own HS drill-down and is never
   * this step's to render. The subcategory question disappears when the member
   * chose the escape route, because that category has no subcategories: leaving
   * it in would strand them on an empty list they could not answer.
   */
  const steps = useMemo<readonly ClassificationStep[]>(() => {
    if (!journey) return [];
    return journey.steps.filter((s) => {
      if (s === "product_classification") return false;
      if (s === "service_subcategory") return !serviceCategoryNeedsCustomLabel(draft.serviceCategory);
      return true;
    });
  }, [journey, draft.serviceCategory]);

  /**
   * How far the member has walked. Progressive disclosure means one question at
   * a time; this is the index of the one on screen. It only ever moves by an
   * explicit action, so an answer changed late never rewinds the journey.
   */
  const [cursor, setCursor] = useState(0);
  const step = steps[cursor];
  const ready = classificationComplete(draft);

  if (!journey || !step) return null;

  const answeredBefore = steps.slice(0, cursor).filter((s) => stepAnswered(draft, s));
  const last = cursor >= steps.length - 1;

  const advance = () => {
    if (last) onNext();
    else setCursor(cursor + 1);
  };

  /**
   * Can this question be left? A required step needs its answer; an optional
   * one can be passed over, and passing over it is a real choice rather than a
   * silence Ponte later fills in.
   */
  const required = journey.required.indexOf(step) >= 0;
  const answered = stepAnswered(draft, step);
  const owesLabel = needsCustomLabel(draft) && !draft.customCategoryLabel?.trim();
  const canAdvance = (!required || answered) && !owesLabel && (!last || ready);

  return (
    <div>
      <Trail draft={draft} steps={answeredBefore} onChange={(s) => setCursor(steps.indexOf(s))} t={t} />

      {step === "service_category" && (
        <TradeServiceCategoryPicker
          icons={icons}
          // The journey heading is already the page's h1. Repeating it here
          // would name the same question twice to a screen reader, so the
          // group is labelled with the instruction instead.
          legend={t("classify.chooseCategory")}
          selectedLabel={t("classify.chosen")}
          value={draft.serviceCategory}
          onChange={(key) =>
            set({
              serviceCategory: key,
              // A different category cannot keep the previous category's
              // subcategories: they would be a classification nobody chose.
              serviceSubcategories: [],
              customCategoryLabel: null,
            })
          }
        >
          {serviceCategoryNeedsCustomLabel(draft.serviceCategory) && (
            <WriteIn
              id="service-other"
              label={
                draft.canonical?.intent === "offer_trade_service"
                  ? t("classify.describeServiceOffer")
                  : t("classify.describeServiceNeed")
              }
              hint={t("classify.describeHint")}
              value={draft.customCategoryLabel}
              onChange={(v) => set({ customCategoryLabel: v })}
            />
          )}
        </TradeServiceCategoryPicker>
      )}

      {step === "service_subcategory" && (
        <TradeServiceSubcategoryPicker
          category={draft.serviceCategory}
          legend={t("classify.chooseSubcategory", {
            category: serviceCategory(draft.serviceCategory)?.label ?? "",
          })}
          selectedLabel={t("classify.chosen")}
          searchLabel={t("classify.searchOptions")}
          searchPlaceholder={t("classify.searchOptionsPlaceholder")}
          emptyLabel={t("classify.noOptionMatch")}
          value={draft.serviceSubcategories}
          onChange={(keys) => set({ serviceSubcategories: keys })}
        >
          {/*
            A category's own "Other ..." entry keeps the parent category, so
            only the missing detail is asked for. The record stays classified
            as freight even when the specific freight service is unusual.
          */}
          {draft.serviceSubcategories.some((k) => serviceSubcategory(k)?.isOther) && (
            <WriteIn
              id="service-sub-other"
              label={
                draft.canonical?.intent === "offer_trade_service"
                  ? t("classify.describeServiceOffer")
                  : t("classify.describeServiceNeed")
              }
              hint={t("classify.describeHint")}
              value={draft.customCategoryLabel}
              onChange={(v) => set({ customCategoryLabel: v })}
            />
          )}
        </TradeServiceSubcategoryPicker>
      )}

      {step === "distribution_partner_type" && (
        <DistributionPartnerTypePicker
          icons={icons}
          legend={t("classify.choosePartner")}
          selectedLabel={t("classify.chosen")}
          value={draft.distributionPartnerType}
          onChange={(key) => set({ distributionPartnerType: key, customCategoryLabel: null })}
        >
          {partnerTypeNeedsCustomLabel(draft.distributionPartnerType) && (
            <WriteIn
              id="partner-other"
              label={t("classify.describeArrangement")}
              hint={t("classify.describeHint")}
              value={draft.customCategoryLabel}
              onChange={(v) => set({ customCategoryLabel: v })}
            />
          )}
        </DistributionPartnerTypePicker>
      )}

      {step === "product_sector" && (
        <ProductSectorPicker
          icons={icons}
          legend={t("classify.chooseSector")}
          hint={journey.required.indexOf("product_sector") >= 0 ? undefined : t("classify.sectorOptional")}
          selectedLabel={t("classify.chosen")}
          value={draft.productSector}
          onChange={(key) => set({ productSector: key })}
        />
      )}

      {step === "distribution_coverage" && (
        <DistributionCoveragePicker
          legend={t("classify.chooseCoverage")}
          selectedLabel={t("classify.chosen")}
          value={draft.coverageScope}
          onChange={(key) =>
            set({
              coverageScope: key,
              // Codes belong to a scope that takes them. Keeping them across a
              // change to Worldwide would store a territory nobody declared.
              territoryCodes: coverageScopeTakesCountries(key) ? draft.territoryCodes : [],
            })
          }
        >
          {coverageScopeTakesCountries(draft.coverageScope) && (
            <Territories
              codes={draft.territoryCodes}
              onChange={(codes) => set({ territoryCodes: codes })}
              t={t}
            />
          )}
        </DistributionCoveragePicker>
      )}

      {step === "distribution_relationship" && (
        <DistributionRelationshipPicker
          icons={icons}
          legend={t("classify.chooseRelationship")}
          hint={t("classify.relationshipOptional")}
          selectedLabel={t("classify.chosen")}
          value={draft.distributionRelationshipTerms}
          onChange={(keys) => set({ distributionRelationshipTerms: keys })}
        />
      )}

      {step === "details" && (
        <div className="pcat">
          <div className="pcat__head">
            <p className="pcat__legend">{t("classify.detailsTitle")}</p>
            <p className="pcat__hint">{t("classify.detailsOptional")}</p>
          </div>
          <div className="pcat__write">
            <textarea
              id="additional-details"
              className="pcat__writea"
              aria-label={t("classify.detailsTitle")}
              placeholder={t("classify.detailsPlaceholder")}
              value={draft.additionalDetails ?? ""}
              onChange={(e) => set({ additionalDetails: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="qnav" style={{ marginTop: 24 }}>
        {!required && !last && (
          <button className="fbtn fbtn--ghost" type="button" onClick={advance}>
            {t("classify.skip")}
          </button>
        )}
        <button className="fbtn fbtn--lg" type="button" disabled={!canAdvance} onClick={advance}>
          {last ? `${t("intent.cta")} →` : t("classify.continue")}
        </button>
      </div>
    </div>
  );
}

/** Every answer so far, each with a way back into it. */
function Trail({
  draft,
  steps,
  onChange,
  t,
}: {
  draft: StructureDraft;
  steps: readonly ClassificationStep[];
  onChange: (step: ClassificationStep) => void;
  t: T;
}) {
  if (steps.length === 0) return null;
  return (
    <div className="pcat-trail">
      {steps.map((step) => {
        const value = trailValue(draft, step);
        if (!value) return null;
        return (
          <span className="pcat-trail__i" key={step}>
            <span className="pcat-trail__k">{t(`field.${TRAIL_FIELD[step]}`)}</span>
            <span className="pcat-trail__v">{value}</span>
            <button className="pcat-trail__c" type="button" onClick={() => onChange(step)}>
              {t("classify.change")}
            </button>
          </span>
        );
      })}
    </div>
  );
}

const TRAIL_FIELD: Record<ClassificationStep, string> = {
  product_sector: "sector",
  product_classification: "product",
  service_category: "serviceCategory",
  service_subcategory: "serviceSubcategory",
  distribution_partner_type: "partnerType",
  distribution_relationship: "relationship",
  distribution_coverage: "coverage",
  details: "note",
};

function trailValue(draft: StructureDraft, step: ClassificationStep): string | null {
  switch (step) {
    case "service_category":
      return serviceCategory(draft.serviceCategory)?.label ?? null;
    case "service_subcategory": {
      const labels = draft.serviceSubcategories
        .map((k) => serviceSubcategory(k)?.label)
        .filter((l): l is string => !!l);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    case "distribution_partner_type":
      return partnerType(draft.distributionPartnerType)?.label ?? null;
    case "distribution_relationship": {
      const labels = draft.distributionRelationshipTerms
        .map((k) => relationshipTerm(k)?.label)
        .filter((l): l is string => !!l);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    case "distribution_coverage": {
      const scope = coverageScope(draft.coverageScope)?.label ?? null;
      if (!scope) return null;
      return draft.territoryCodes.length > 0
        ? `${scope} (${draft.territoryCodes.join(", ")})`
        : scope;
    }
    case "product_sector":
      return PRODUCT_SECTORS.find((s) => s.key === draft.productSector)?.label ?? null;
    case "product_classification":
      return draft.product;
    case "details":
      return draft.additionalDetails ? draft.additionalDetails.slice(0, 40) : null;
  }
}

/** The field Other reveals. Targeted at the one thing that is missing. */
function WriteIn({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="pcat__write">
      <label className="pcat__writel" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="pcat__writei"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="pcat__writeh">{hint}</p>
    </div>
  );
}

/** Countries, stored as ISO-2 codes rather than only as prose. */
function Territories({
  codes,
  onChange,
  t,
}: {
  codes: readonly string[];
  onChange: (codes: string[]) => void;
  t: T;
}) {
  const add = (code: string) => {
    if (!code || codes.indexOf(code) >= 0) return;
    onChange(codes.concat([code]));
  };
  const remove = (code: string) => onChange(codes.filter((c) => c !== code));

  return (
    <div className="pcat__write">
      <p className="pcat__writel">{t("classify.territories")}</p>
      <CountryPicker value="" onChange={add} />
      <p className="pcat__writeh">{t("classify.territoriesHint")}</p>
      {codes.length > 0 && (
        <div className="pcat-terr">
          {codes.map((code) => (
            <span className="pcat-terr__i" key={code}>
              {COUNTRIES.find((c) => c.code === code)?.name ?? code}
              <button
                className="pcat-terr__x"
                type="button"
                aria-label={`${t("classify.remove")} ${code}`}
                onClick={() => remove(code)}
              >
                {t("classify.remove")}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
