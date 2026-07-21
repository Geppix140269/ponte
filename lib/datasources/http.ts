/*
 * The only way this codebase talks to a third party datasource.
 *
 * Every public data provider here is somebody else's free service, most of
 * them run by a public body on a public budget. Being a good client of them is
 * not politeness, it is the condition of continuing to have access: Nominatim
 * and Overpass both ban by User-Agent and by rate, and a ban is silent and
 * total. So: one identified User-Agent, one throttle, one backoff, and a
 * timeout on everything.
 */

const CONTACT =
  process.env.DATASOURCE_CONTACT_EMAIL?.trim() || "ops@ponte.trade";

export const USER_AGENT = `Ponte/1.0 (+https://ponte.trade; ${CONTACT})`;

export const DEFAULT_TIMEOUT_MS = 15_000;

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/*
 * Per host minimum spacing between requests, in milliseconds.
 *
 * OSM's terms are an absolute maximum of one request per second per
 * application, for the whole application and not per user. That is a hard
 * condition of use, not a guideline, so it is enforced here rather than left
 * to each caller to remember.
 */
const MIN_INTERVAL_MS: Record<string, number> = {
  "nominatim.openstreetmap.org": 1100,
  "overpass-api.de": 1100,
};

const lastRequestAt = new Map<string, number>();

/**
 * Wait until this host is allowed to be called again.
 *
 * The reservation is written before the wait, so two concurrent callers queue
 * behind each other instead of both reading the same timestamp and firing
 * together. Within one server instance this is exact; across instances it is
 * best effort, which is why the throttled sources are also cached hard.
 */
async function reserveSlot(host: string): Promise<void> {
  const interval = MIN_INTERVAL_MS[host];
  if (!interval) return;

  const now = Date.now();
  const earliest = Math.max(now, (lastRequestAt.get(host) ?? 0) + interval);
  lastRequestAt.set(host, earliest);

  const wait = earliest - now;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

export type FetchOptions = {
  timeoutMs?: number;
  /** Attempts after the first. Only 429, 5xx and network faults are retried. */
  retries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/**
 * Fetch with a timeout, an identified agent, and backoff on 429 and 5xx.
 *
 * A 4xx other than 429 is not retried: the request is wrong, and sending it
 * again only spends someone else's quota to be told so a second time.
 */
export async function fetchUpstream(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 2,
    headers = {},
    signal,
  } = options;

  const host = new URL(url).host;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await reserveSlot(host);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // The caller's own cancellation, for example a closed request, has to
    // reach the upstream too, or the timeout is the only way out.
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...headers,
        },
      });

      if (response.ok) return response;

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === retries) {
        throw new UpstreamError(
          `${host} answered ${response.status}`,
          response.status,
          retryable,
        );
      }

      // Honour the upstream's own instruction when it gives one, capped so a
      // provider asking for an hour cannot hold a request handler open.
      const asked = retryAfterMs(response);
      const backoff = Math.min(asked ?? 2 ** attempt * 500, 8_000);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      lastError = new UpstreamError(`${host} answered ${response.status}`, response.status, true);
    } catch (error) {
      lastError = error;
      const aborted = error instanceof Error && error.name === "AbortError";
      // A caller who cancelled does not want a retry, only a timeout does.
      if (aborted && signal?.aborted) throw error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  if (lastError instanceof UpstreamError) throw lastError;
  const reason = lastError instanceof Error ? lastError.message : "unknown fault";
  throw new UpstreamError(`${host} did not answer: ${reason}`, undefined, true);
}

/** fetchUpstream, parsed as JSON. */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await fetchUpstream(url, options);
  try {
    return (await response.json()) as T;
  } catch {
    throw new UpstreamError(`${new URL(url).host} returned unreadable JSON`);
  }
}
