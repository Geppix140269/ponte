import { getTranslations } from "next-intl/server";

// Terms and Privacy are not translated. A translated contract would be a
// second, unreviewed instrument. The notice itself IS translated, so a reader
// in any language understands why the page below it is English.
export default async function LegalOriginalNotice() {
  const t = await getTranslations("legal");

  return (
    <p className="mb-8 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-2">
      {t("originalsInEnglish")}
    </p>
  );
}
