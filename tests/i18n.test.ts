import { describe, it, expect } from "vitest";
import { t, resolveLocale, SUPPORTED_LOCALES, isRtl, dir } from "@/lib/i18n";
import { EN } from "@/lib/i18n/dictionaries";

describe("i18n", () => {
  it("returns the localized string when present", () => {
    expect(t("nav.verify", "it")).toBe("Verifica");
    expect(t("nav.verify", "en")).toBe("Verify");
  });
  it("falls back to English for an untranslated locale", () => {
    expect(t("settlement.securedByPonte", "fr")).toBe(EN["settlement.securedByPonte"]);
  });
  it("never throws on an unknown locale and degrades to English", () => {
    expect(t("plan.pro", "zh")).toBe("Pro");
  });
  it("resolveLocale prefers a valid cookie, then Accept-Language, then default", () => {
    expect(resolveLocale({ cookie: "it" })).toBe("it");
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "es-ES,es;q=0.9,en;q=0.8" })).toBe("es");
    expect(resolveLocale({ acceptLanguage: "en-GB,en;q=0.9" })).toBe("en");
    expect(resolveLocale({})).toBe("en");
  });
  it("marks Arabic as RTL and others LTR", () => {
    expect(isRtl("ar")).toBe(true);
    expect(dir("ar")).toBe("rtl");
    expect(dir("it")).toBe("ltr");
  });
  it("every supported locale has at least the English fallback available", () => {
    for (const l of SUPPORTED_LOCALES) expect(typeof t("plan.free", l)).toBe("string");
  });
});
