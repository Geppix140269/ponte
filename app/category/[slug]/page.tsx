import { redirect } from "next/navigation";

// Category landing pages were retired in the July 2026 brokerage
// repositioning. All legacy category URLs route to /pricing.
export default function CategoryPage() {
  redirect("/pricing");
}
