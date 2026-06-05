// Creates the 3 recurring EUR subscription prices in Stripe and prints the env
// lines. Idempotent: reuses a product/price if one already matches.
// Run:  node scripts/setup-stripe-prices.mjs
// Needs STRIPE_SECRET_KEY in the environment (already in your .env).
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("Missing STRIPE_SECRET_KEY"); process.exit(1); }
const stripe = new Stripe(key);

const PLANS = [
  { name: "Ponte Starter",    env: "STRIPE_PRICE_STARTER_MONTH",    amount: 4900 },
  { name: "Ponte Pro",        env: "STRIPE_PRICE_PRO_MONTH",        amount: 14900 },
  { name: "Ponte Enterprise", env: "STRIPE_PRICE_ENTERPRISE_MONTH", amount: 49900 },
];

const out = [];
const allProducts = await stripe.products.list({ limit: 100, active: true });

for (const p of PLANS) {
  let product = allProducts.data.find((x) => x.name === p.name);
  if (!product) product = await stripe.products.create({ name: p.name });

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(
    (x) => x.unit_amount === p.amount && x.currency === "eur" && x.recurring?.interval === "month",
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id, unit_amount: p.amount, currency: "eur", recurring: { interval: "month" },
    });
  }
  out.push(`${p.env}=${price.id}`);
}

console.log("\n=== Stripe price IDs (set these in Netlify) ===");
for (const line of out) console.log(line);
