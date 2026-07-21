import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale aware Link and router. Using these keeps the active language on
// every internal navigation without hand building prefixes.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
