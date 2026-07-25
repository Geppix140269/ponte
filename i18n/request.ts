import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // Any unsupported locale (a deferred language, or a browser locale we do not
  // ship, e.g. "ja") resolves to English.
  const locale = resolveLocale(requested);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
