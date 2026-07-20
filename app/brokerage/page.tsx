import { redirect } from "next/navigation";

// July 2026: the Deal Desk merged into the Marketplace. One door.
export default function BrokeragePage() {
  redirect("/marketplace");
}
