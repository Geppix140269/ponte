/*
 * Ponte service worker.
 *
 * WHAT THIS DOES NOT DO, ON PURPOSE.
 *
 * It never stores a page. Not the board, not a listing, not the account page.
 * A marketplace where the rows are stale is worse than one that says it is
 * offline, and a cached HTML response on an authenticated site is how one
 * member's page ends up on another member's screen. So: online means always
 * fresh from the network, offline means an honest offline page. There is no
 * third state where the reader is looking at yesterday's board and cannot tell.
 *
 * The only things kept are the offline page itself and static assets that
 * cannot go stale because their filename contains a hash of their content.
 *
 * KILL SWITCH. If this worker ever misbehaves in the wild, replace the body of
 * this file with:
 *
 *     self.addEventListener("install", () => self.skipWaiting());
 *     self.addEventListener("activate", (e) => e.waitUntil(
 *       caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))
 *         .then(() => self.registration.unregister())
 *         .then(() => self.clients.matchAll())
 *         .then(cs => cs.forEach(c => c.navigate(c.url)))
 *     ));
 *
 * and deploy. It works because /sw.js is never cached by this worker and is
 * registered with updateViaCache: "none", so every browser revalidates it.
 */

const VERSION = "v1";
const OFFLINE_CACHE = `ponte-offline-${VERSION}`;
const ASSET_CACHE = `ponte-assets-${VERSION}`;
const CURRENT = [OFFLINE_CACHE, ASSET_CACHE];

// English is the unprefixed locale, so this is the English offline page.
const DEFAULT_OFFLINE = "/offline";

// Paths that must never be served from, or written to, a cache. API responses
// and auth callbacks are per request, and the admin area is per person.
const NEVER = [/^\/api\//, /^\/auth\//, /^\/admin(\/|$)/, /^\/sw\.js$/];

// Content addressed by Next. The filename changes when the bytes change, so a
// hit can never be stale and a miss can never be wrong.
const IMMUTABLE = /^\/_next\/static\//;

// Everything else worth keeping: brand art, icons, fonts. These keep their
// filename across a change, so they are revalidated in the background rather
// than trusted outright.
const REVALIDATE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/;

/*
 * The locale prefix of a path, or "" for English. Deliberately derived here
 * rather than hardcoding the ten locales from i18n/routing.ts: a list copied
 * into a static file in public/ is a list that goes out of date silently.
 * No route in this app is two letters long, so the shape is unambiguous.
 */
function localePrefix(pathname) {
  const first = pathname.split("/")[1];
  return /^[a-z]{2}$/.test(first) ? `/${first}` : "";
}

function offlineUrlFor(pathname) {
  return `${localePrefix(pathname)}/offline`;
}

function isNever(pathname) {
  return NEVER.some((rule) => rule.test(pathname));
}

self.addEventListener("install", (event) => {
  // Only the English offline page is fetched up front. The rest arrive the
  // first time someone browses in their own language, see cacheOfflineFor.
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(DEFAULT_OFFLINE, { cache: "reload" })))
      // A failed precache must not block activation. Worst case the reader
      // gets the browser's own offline screen, which is the behaviour they
      // had before this worker existed.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("ponte-") && !CURRENT.includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// The page asks for the new worker to take over immediately after an update.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

/*
 * Fetch and store the offline page for this reader's language, once. Fire and
 * forget: it must never delay or fail the navigation that triggered it.
 */
function cacheOfflineFor(pathname) {
  const url = offlineUrlFor(pathname);
  if (url === DEFAULT_OFFLINE) return;
  caches.open(OFFLINE_CACHE).then(async (cache) => {
    if (await cache.match(url)) return;
    try {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) await cache.put(url, response);
    } catch {
      // Offline, or the page moved. Either way the English fallback stands.
    }
  });
}

async function handleNavigation(request) {
  const { pathname } = new URL(request.url);
  try {
    const response = await fetch(request);
    // Not cached. See the note at the top of this file.
    cacheOfflineFor(pathname);
    return response;
  } catch {
    const cache = await caches.open(OFFLINE_CACHE);
    const match =
      (await cache.match(offlineUrlFor(pathname))) ??
      (await cache.match(DEFAULT_OFFLINE));
    if (match) return match;
    throw new Error("offline, and no offline page is cached");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // A cache is a store of GET responses. Anything else, and anything belonging
  // to another origin, is none of this worker's business.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNever(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (REVALIDATE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // Everything else, including the React server component payloads behind
  // client side navigation, goes to the network untouched.
});
