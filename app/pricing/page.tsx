import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { formatPlanPrice, PLAN_FEATURES, PLAN_ORDER } from "@/lib/network/pricing-display";
import { SubscribeButton } from "@/components/network/SubscribeButton";

export const metadata: Metadata = { title: "Pricing — ponte.trade" };

export default function PricingPage() {
  return (
    <section className="container-px py-16 max-w-container mx-auto">
      <h1 className="serif text-ink text-center" style={{ fontSize: 40, fontWeight: 500 }}>Plans built on trust</h1>
      <p className="mt-3 text-center text-[15px] text-gray-2">Start free. Upgrade for verification, deal rooms, and ADAMftd checks.</p>

      <div className="mt-12 grid gap-5 lg:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const def = PLANS[plan];
          const highlight = plan === "pro";
          return (
            <div key={plan} className={`glass p-7 flex flex-col ${highlight ? "ring-1 ring-gold/50" : ""}`}>
              {highlight && <span className="badge-gold self-start mb-3">Most popular</span>}
              <h2 className="serif text-ink" style={{ fontSize: 22, fontWeight: 500 }}>{def.name}</h2>
              <p className="serif text-ink mt-2" style={{ fontSize: 30, fontWeight: 500 }}>{formatPlanPrice(plan)}</p>
              <ul className="mt-5 space-y-2 flex-1">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-gray-2">
                    <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <div className="mt-6"><SubscribeButton plan={plan} contactSales={def.contactSales} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
