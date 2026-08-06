/**
 * The bridge system's faces, self-hosted.
 *
 * ## Why not the prototype's link tag
 *
 * `ponte-platform.html` pulls five families from `fonts.googleapis.com`. Doing
 * that in production puts a third-party request on every visit, carrying the
 * member's IP and referring URL to Google before a single word of Ponte has
 * rendered. That is a PRIVACY change, not only a performance one, and it is not
 * one to make by copying a prototype's convenience.
 *
 * `next/font/google` downloads the files at build time and serves them from
 * Ponte's own origin. No runtime request leaves the site, and the CSS variables
 * are identical to the ones the prototype's tokens expect.
 *
 * ## The four new families
 *
 * Arabic and Chinese need their own faces: Playfair has no Arabic coverage at
 * all, and Inter's CJK fallback is whatever the device happens to have, which
 * is how the same screen looks considered on one phone and accidental on
 * another. Amiri and the two Noto SC faces are the prototype's choices and are
 * kept.
 *
 * Subsetting matters here more than usual: the SC faces are large, so they are
 * loaded only for the scripts that need them and `display: swap` keeps the
 * first paint readable in the fallback rather than blank.
 */
import {
  Playfair_Display,
  Inter,
  JetBrains_Mono,
  Amiri,
  Noto_Sans_Arabic,
  Noto_Serif_SC,
  Noto_Sans_SC,
} from "next/font/google";

export const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Arabic display. Amiri is a naskh face and carries the serif role. */
export const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400"],
  variable: "--font-noto-arabic",
  display: "swap",
});

export const notoSerifSc = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-noto-serif-sc",
  display: "swap",
});

export const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

/**
 * Every face the system can resolve to, as one class string.
 *
 * Published on the shell rather than per component, because `tokens.css`
 * selects between them with `:lang()`: a component never names a face, so a
 * component can never be the reason a script falls back.
 */
export const bridgeFontVars = [
  playfair.variable,
  inter.variable,
  jetbrains.variable,
  amiri.variable,
  notoArabic.variable,
  notoSerifSc.variable,
  notoSansSc.variable,
].join(" ");
