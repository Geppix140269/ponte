/**
 * The Deal Room supported-language set.
 *
 * ## This is not the interface locale list, and the distinction is load-bearing
 *
 * `i18n/routing.ts` governs the *interface* language, which is English-only
 * (`locales = ["en"]`). ADR-0016 is explicit that multilingual Deal Room
 * participation "does not reactivate a general site interface" and "does not
 * supersede the English-only general interface policy in AGENTS.md and
 * LANGUAGES.md". So this module is deliberately separate from
 * `i18n/routing.ts`: it must never feed the site `LanguageSwitcher`, the
 * next-intl `locales` array, or locale-prefixed routing.
 *
 * What it governs is a fourth, distinct concern (LANGUAGES.md keeps three
 * apart; this adds the fourth): the language an admitted Deal Room participant
 * reads authorised discussion in, and the language they author a message in,
 * inside a private sub-room. English remains the canonical language for the
 * structured deal record, database objects and workflow states.
 *
 * The values are canonical BCP-47 tags, fixed by ADR-0016. Note `zh-CN` carries
 * a region subtag where the deferred interface list in `i18n/routing.ts` uses a
 * bare `zh`; the two lists are separate systems and are allowed to differ.
 */

/** The five supported Deal Room languages, as canonical BCP-47 tags (ADR-0016). */
export const DEAL_ROOM_LANGUAGES = ["en", "es", "ru", "zh-CN", "ar"] as const;

export type DealRoomLanguage = (typeof DEAL_ROOM_LANGUAGES)[number];

/**
 * English is the canonical Deal Room language and the safe fallback. An
 * unsupported or malformed preference resolves here rather than failing, so a
 * bad stored value never blocks a participant from reading original content.
 */
export const DEFAULT_DEAL_ROOM_LANGUAGE: DealRoomLanguage = "en";

/**
 * Right-to-left scripts among the supported languages. Only Arabic today. Used
 * for per-message `dir` and mixed-script handling in the Deal Room surfaces;
 * the surrounding site remains left-to-right (ADR-0016 section 95).
 */
export const DEAL_ROOM_RTL_LANGUAGES = ["ar"] as const;

/** Native endonyms, shown to a participant choosing their own language. */
export const DEAL_ROOM_LANGUAGE_NAMES: Record<DealRoomLanguage, string> = {
  en: "English",
  es: "Español",
  ru: "Русский",
  "zh-CN": "简体中文",
  ar: "العربية",
};

/**
 * Whether a value is exactly one of the supported tags. Strict: used to
 * validate a declared or stored preference, and to refuse a forged language on
 * a message or translation row. It does not normalise; use
 * `resolveDealRoomLanguage` for incoming candidates.
 */
export function isSupportedDealRoomLanguage(value: unknown): value is DealRoomLanguage {
  return typeof value === "string" && (DEAL_ROOM_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Map an incoming or candidate language to a supported Deal Room language,
 * falling back to English.
 *
 * Mirrors the intent of `resolveLocale` in `i18n/routing.ts`: anything not
 * actively supported becomes the canonical language rather than an error.
 *
 * Matching is, in order: an exact case-insensitive tag match (so `zh-cn` and
 * `ZH-CN` both reach `zh-CN`); then the primary language subtag, so a regional
 * or scripted variant resolves to the one supported tag for that language
 * (`es-ES` to `es`, `ar-SA` to `ar`, `en-GB` to `en`, and any `zh...` such as
 * `zh-Hans` or a bare `zh` to `zh-CN`, the only supported Chinese variant).
 * An unsupported language (`ja`, `pt`), an empty string, whitespace, a
 * malformed tag, `null` or `undefined` all fall back to English.
 */
export function resolveDealRoomLanguage(candidate: string | null | undefined): DealRoomLanguage {
  if (!candidate) return DEFAULT_DEAL_ROOM_LANGUAGE;
  const tag = candidate.trim();
  if (!tag) return DEFAULT_DEAL_ROOM_LANGUAGE;

  const lower = tag.toLowerCase();
  for (const language of DEAL_ROOM_LANGUAGES) {
    if (language.toLowerCase() === lower) return language;
  }

  const primary = lower.split(/[-_]/)[0];
  switch (primary) {
    case "en":
      return "en";
    case "es":
      return "es";
    case "ru":
      return "ru";
    case "ar":
      return "ar";
    case "zh":
      return "zh-CN";
    default:
      return DEFAULT_DEAL_ROOM_LANGUAGE;
  }
}

/** Whether a supported language is written right to left. */
export function isRtlDealRoomLanguage(language: DealRoomLanguage): boolean {
  return (DEAL_ROOM_RTL_LANGUAGES as readonly string[]).includes(language);
}

/**
 * The HTML `dir` value for a supported language. Drives per-message direction
 * on the Deal Room surfaces without changing the surrounding LTR layout.
 */
export function dealRoomLanguageDir(language: DealRoomLanguage): "rtl" | "ltr" {
  return isRtlDealRoomLanguage(language) ? "rtl" : "ltr";
}
