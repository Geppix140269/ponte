/**
 * The landing's editorial type, loaded only for this page and exposed as CSS
 * variables the scoped stylesheet maps onto the Brand v5 font tokens.
 *
 * Playfair Display is the display / editorial face ("What's your deal?", the
 * italic supporting question, the archway titles). JetBrains Mono carries every
 * label, route number and fact. Inter (the body face) is already loaded globally
 * as --font-inter, so it is not re-declared here.
 *
 * The rest of the app keeps Inter + Space Grotesk; these two faces never leave
 * the .ponte-landing subtree.
 */
import { Playfair_Display, JetBrains_Mono } from "next/font/google";

export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Class string applied to the landing wrapper to publish the font variables. */
export const landingFontVars = `${playfair.variable} ${jetbrainsMono.variable}`;
