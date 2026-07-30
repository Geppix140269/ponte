"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

/** The account destination in the Desk command bar. */
export default function DeskAccount({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pathname === "/login") return null;

  if (signedIn) {
    return (
      <Link className="cmd__acct" href="/account">
        Account
      </Link>
    );
  }

  const query = params?.toString();
  const next = query ? `${pathname}?${query}` : pathname;

  return (
    <Link className="cmd__acct" href={`/login?next=${encodeURIComponent(next)}`}>
      Sign in
    </Link>
  );
}
