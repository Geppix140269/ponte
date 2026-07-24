/**
 * The rotating example requests shown in the type field placeholder.
 *
 * These are illustrative and fixed: they do NOT follow the site locale. They
 * always cycle the same five languages, beginning with English and returning to
 * English, so a visitor in any locale sees that Ponte reads objectives in their
 * own words. Only the example rotates; every permanent interface string stays in
 * the active site locale.
 *
 * Order and wording are from the design handoff (04_FINAL_COPY). Arabic sets the
 * field direction to rtl for that frame only; the page never flips.
 */

export type ExampleLang = "en" | "it" | "zh" | "ar" | "es";

export interface RotatingExample {
  code: ExampleLang;
  dir: "ltr" | "rtl";
  /** BCP-47 tag for the field's lang attribute while this frame shows. */
  lang: string;
  text: string;
}

export const ROTATING_EXAMPLES: RotatingExample[] = [
  {
    code: "en",
    dir: "ltr",
    lang: "en",
    text: "Find buyers in India for 500 MT of almonds.",
  },
  {
    code: "it",
    dir: "ltr",
    lang: "it",
    text: "Cerco acquirenti in Germania per il mio olio d'oliva.",
  },
  {
    code: "zh",
    dir: "ltr",
    lang: "zh",
    text: "我想为我们的工业阀门寻找欧洲买家。",
  },
  {
    code: "ar",
    dir: "rtl",
    lang: "ar",
    text: "أريد التحقق من شركة قبل التعامل معها.",
  },
  {
    code: "es",
    dir: "ltr",
    lang: "es",
    text: "Necesito estructurar una solicitud de compra de azúcar.",
  },
];
