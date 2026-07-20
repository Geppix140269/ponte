import { redirect } from "next/navigation";

// The multi-product catalogue was retired in the July 2026 brokerage
// repositioning. One report remains; everything else routes to /pricing.
export default function CataloguePage() {
  redirect("/pricing");
}
