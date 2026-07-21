/*
 * Foreign exchange, agreed by more than one provider.
 *
 * A rate is the one number on this platform that turns directly into money, so
 * no single free feed is trusted alone. Free FX endpoints go stale quietly:
 * they keep answering 200 with yesterday's rate, which is indistinguishable
 * from a working feed unless something else is asked the same question.
 *
 * So every lookup asks all configured providers, takes the median, and names
 * any provider more than one percent away rather than dropping it. A quiet
 * discard would hide exactly the event worth seeing.
 */

import { fetchJson } from "../http";
import { withCache, cacheKey } from "../cache";
import { fail, type DataSourceResult, type FxResult, type SourceMeta } from "../types";

export const FX_SOURCES: SourceMeta[] = [
  {
    id: "fx.ecb",
    category: "fx",
    provider: "European Central Bank, via Frankfurter",
    endpoint: "https://api.frankfurter.app/latest",
    auth: "none",
    ttlSeconds: 60 * 60 * 24,
    commercialOk: true,
    note: "ECB reference rates, published once each working day around 16:00 CET.",
  },
  {
    id: "fx.exchangerate",
    category: "fx",
    provider: "ExchangeRate-API open endpoint",
    endpoint: "https://open.er-api.com/v6/latest",
    auth: "none",
    ttlSeconds: 60 * 60 * 24,
    commercialOk: true,
    note: "Free open endpoint, attribution requested, no key.",
  },
  {
    id: "fx.freecurrency",
    category: "fx",
    provider: "FreeCurrencyAPI",
    endpoint: "https://api.freecurrencyapi.com/v1/latest",
    auth: "freemium",
    envVar: "FREECURRENCYAPI_KEY",
    ttlSeconds: 60 * 60 * 24,
    commercialOk: true,
    note: "Optional third opinion. Skipped entirely when the key is absent.",
  },
];

/** The aggregate is what gets cached, so a single dead provider is survivable. */
const FX_AGGREGATE: Pick<SourceMeta, "id" | "ttlSeconds"> = {
  id: "fx.median",
  ttlSeconds: 60 * 60 * 24,
};

type Quote = { id: string; rate: number };

async function fromFrankfurter(base: string, quote: string): Promise<Quote> {
  const data = await fetchJson<{ rates: Record<string, number> }>(
    `https://api.frankfurter.app/latest?from=${base}&to=${quote}`,
  );
  const rate = data.rates?.[quote];
  if (!Number.isFinite(rate)) throw new Error(`no ${quote} rate`);
  return { id: "fx.ecb", rate };
}

async function fromExchangeRateApi(base: string, quote: string): Promise<Quote> {
  const data = await fetchJson<{ result: string; rates: Record<string, number> }>(
    `https://open.er-api.com/v6/latest/${base}`,
  );
  if (data.result !== "success") throw new Error("provider reported failure");
  const rate = data.rates?.[quote];
  if (!Number.isFinite(rate)) throw new Error(`no ${quote} rate`);
  return { id: "fx.exchangerate", rate };
}

async function fromFreeCurrencyApi(base: string, quote: string): Promise<Quote> {
  const key = process.env.FREECURRENCYAPI_KEY;
  if (!key) throw new Error("not configured");
  const data = await fetchJson<{ data: Record<string, number> }>(
    `https://api.freecurrencyapi.com/v1/latest?apikey=${encodeURIComponent(key)}&base_currency=${base}&currencies=${quote}`,
  );
  const rate = data.data?.[quote];
  if (!Number.isFinite(rate)) throw new Error(`no ${quote} rate`);
  return { id: "fx.freecurrency", rate };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const CURRENCY = /^[A-Z]{3}$/;

export async function getFxRate(
  baseInput: string,
  quoteInput: string,
): Promise<DataSourceResult<FxResult>> {
  const base = baseInput.trim().toUpperCase();
  const quote = quoteInput.trim().toUpperCase();

  if (!CURRENCY.test(base) || !CURRENCY.test(quote)) {
    return fail("fx.median", "Currencies must be three letter ISO 4217 codes.");
  }
  if (base === quote) {
    return fail("fx.median", "Base and quote currency are the same.");
  }

  return withCache(FX_AGGREGATE, cacheKey({ base, quote }), async () => {
    const settled = await Promise.allSettled([
      fromFrankfurter(base, quote),
      fromExchangeRateApi(base, quote),
      fromFreeCurrencyApi(base, quote),
    ]);

    const quotes = settled
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
      .map((r) => r.value);

    if (quotes.length === 0) {
      throw new Error("no exchange rate provider answered");
    }

    const mid = median(quotes.map((q) => q.rate));
    const providers = quotes.map((q) => ({
      ...q,
      // With a single provider there is nothing to disagree with, so nothing
      // is marked an outlier. The thin evidence shows in providers.length.
      outlier: quotes.length > 1 && Math.abs(q.rate - mid) / mid > 0.01,
    }));

    const result: FxResult = {
      base,
      quote,
      rate: mid,
      providers,
      disagreement: providers.some((p) => p.outlier),
      asOf: new Date().toISOString(),
    };
    return result;
  });
}
