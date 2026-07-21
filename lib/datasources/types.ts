/*
 * One shape for every third party datasource on the platform.
 *
 * The point of the envelope is that a caller never has to know whether the
 * number in front of it came from the upstream a second ago or from cache
 * three weeks ago. It always knows which, because `stale` and `fetchedAt` are
 * not optional. A page that shows a tariff without saying how old it is, is a
 * page that will eventually show a wrong number confidently.
 */

/** How a source is authenticated, which decides whether it can ship today. */
export type AuthClass =
  /** No key, no account. Callable immediately. */
  | "none"
  /** Free, but somebody has to register and paste a key into the host. */
  | "register"
  /** Has a free tier that needs a key, and a paid tier above it. */
  | "freemium";

export type Confidence = "high" | "medium" | "low";

export type SourceMeta = {
  id: string;
  category: "tariff" | "fta" | "fx" | "tenders" | "sanctions" | "logistics";
  provider: string;
  endpoint: string;
  auth: AuthClass;
  /** The env var holding the key, when auth is not "none". */
  envVar?: string;
  /** How long a cached answer is treated as current, in seconds. */
  ttlSeconds: number;
  /**
   * Whether the licence permits reselling the data, as opposed to merely
   * reading it. "Free to access" is not "free to redistribute", and the
   * difference is a legal one rather than a technical one. When this is false
   * the data may inform a Ponte answer but must not be republished verbatim.
   */
  commercialOk: boolean;
  /** Anything a future reader needs, especially licence restrictions. */
  note?: string;
};

export type DataSourceResult<T> =
  | {
      ok: true;
      data: T;
      /** Which source id answered. */
      source: string;
      /** True when the payload came from cache past its TTL. */
      stale: boolean;
      fetchedAt: string;
    }
  | {
      ok: false;
      /** Safe to show a member. Never contains a key or an upstream URL. */
      error: string;
      source: string;
      stale: false;
    };

export function ok<T>(
  data: T,
  source: string,
  opts: { stale?: boolean; fetchedAt?: string } = {},
): DataSourceResult<T> {
  return {
    ok: true,
    data,
    source,
    stale: opts.stale ?? false,
    fetchedAt: opts.fetchedAt ?? new Date().toISOString(),
  };
}

export function fail<T>(source: string, error: string): DataSourceResult<T> {
  return { ok: false, error, source, stale: false };
}

/** The normalized answer for any tariff lookup, whichever upstream produced it. */
export type TariffResult = {
  hsCode: string;
  origin: string;
  destination: string;
  year: number;
  mfnRate: number | null;
  preferentialRate: number | null;
  ftaName?: string;
  additionalDuties?: {
    type: "ADD" | "CVD" | "safeguard" | "s301";
    rate: number;
    note?: string;
  }[];
  source: string;
  sourceUrl: string;
  confidence: Confidence;
};

/**
 * A rate agreed by more than one provider.
 *
 * Money crossing a border on a wrong decimal is the expensive kind of bug, so
 * no single upstream is trusted on its own. The median is reported, every
 * provider that answered is listed, and a provider more than one percent from
 * the median is named rather than quietly dropped: a real divergence usually
 * means one feed is stale, and the reader should see that it happened.
 */
export type FxResult = {
  base: string;
  quote: string;
  rate: number;
  providers: { id: string; rate: number; outlier: boolean }[];
  /** True when any provider disagreed with the median by more than 1%. */
  disagreement: boolean;
  asOf: string;
};
