import { redirect } from "next/navigation";

// July 2026: the Deal Sheet page is superseded by the one-door Marketplace.
// The digest itself is not retired: components/NetworkForm.tsx and the
// /api/brokerage/submit "network" type stay in place for the matched-alert
// and weekly-digest work. A permanent redirect is configured in
// next.config.mjs; this stub is the fallback.
export default function NetworkPage() {
  redirect("/marketplace");
}
