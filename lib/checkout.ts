import type { CartItem } from "./types";

// Posts the cart to the checkout API and redirects to Stripe Checkout.
// Until Stripe keys are configured the API returns 503 and we fall back to
// the /checkout notice page so the live UX stays clean.
export async function startCheckout(items: CartItem[]): Promise<void> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url ?? "/checkout";
      return;
    }

    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "mixed_cart") {
        alert(
          "Subscriptions must be purchased separately from one-time reports. Please check out them in separate orders.",
        );
        return;
      }
    }

    // not_configured or any other error → setup notice page
    window.location.href = "/checkout";
  } catch {
    window.location.href = "/checkout";
  }
}
