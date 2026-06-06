import type { Metadata } from "next";
import { listMyDealsRich } from "@/lib/network/deal-data";
import { DealsTerminal } from "@/components/network/DealsTerminal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deals", robots: { index: false } };

export default async function DealsPage() {
  const deals = await listMyDealsRich();
  return (
    <div className="container-px max-w-container mx-auto">
      <DealsTerminal deals={deals} />
    </div>
  );
}
