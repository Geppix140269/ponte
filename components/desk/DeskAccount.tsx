"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

/**
 * The account slot on the Desk command bar.
 *
 * It is in the COMMAND BAR and never on the journey rail. The rail carries
 * journey positions only; account, profile and settings are product
 * destinations, and putting one on the rail is the exact thing the rail rule
 * forbids.
 *
 * Signed out it offers the one door: `/login`, the existing full-page sign-in,
 * with `?next=` set to the page the member is standing on. That parameter is
 * already honoured and already sanitised by the login page, which accepts only
 * same-site paths, so this control adds a return destination rather than a new
 * authentication mechanism.
 *
 * The return path is built on the client because it has to be the CURRENT
 * location, including the query. A member reading a filtered board or a stated
 * objective comes back to that board with the objective intact, not to a
 * generic landing.
 *
 * Signed in it stops being a door and becomes a route to the member's own
 * records, which is the only personal surface the Desk has. It deliberately
 * does not link to `/account`: that page still renders the legacy chrome the
 * Desk replaces, and sending a signed-in member there from the Desk header
 * would reopen the seam this system exists to close.
 */
export default function DeskAccount({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();

  // A Sign in control on the sign-in page is a button that leads to where you
  // already are. It is removed rather than replaced: the page itself is the
  // account affordance, and a second one would only compete with it.
  if (pathname === "/login") return null;

  if (signedIn) {
    return (
      <Link className="cmd__acct" href="/opportunities">
        Your records
      </Link>
    );
  }

  // usePathname is locale-stripped, which is what `next` wants: the login page
  // pushes a locale-relative path back through the same router.
  const query = params?.toString();
  const next = query ? `${pathname}?${query}` : pathname;

  return (
    <Link className="cmd__acct" href={`/login?next=${encodeURIComponent(next)}`}>
      Sign in
    </Link>
  );
}
