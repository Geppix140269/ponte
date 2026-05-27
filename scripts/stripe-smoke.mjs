import { readFileSync } from "node:fs";
import Stripe from "stripe";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("FAIL: STRIPE_SECRET_KEY not set"); process.exit(1); }
console.log("Key prefix:", key.slice(0, 8) + "..." + key.slice(-4));

const stripe = new Stripe(key);

try {
  const s = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 100, product_data: { name: "PONTE SMOKE - DELETE" } } }],
    success_url: "https://ponte.trade/success",
    cancel_url: "https://ponte.trade/cancel",
  });
  console.log("PASS one-time checkout:", s.id);
} catch (e) { console.error("FAIL one-time:", e.message); }

try {
  const s = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 100, recurring: { interval: "month" }, product_data: { name: "PONTE SMOKE SUB - DELETE" } } }],
    success_url: "https://ponte.trade/success",
    cancel_url: "https://ponte.trade/cancel",
  });
  console.log("PASS subscription checkout:", s.id);
} catch (e) { console.error("FAIL subscription:", e.message); }
