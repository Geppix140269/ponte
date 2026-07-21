import { redirect } from "next/navigation";

// July 2026: the report catalogue is fully retired. All product URLs
// redirect to /pricing.
export default function ProductPage() {
  redirect("/pricing");
}
