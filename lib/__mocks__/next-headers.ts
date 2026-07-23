// Test double for next/headers cookies(). A tiny mutable jar the test seeds
// with __setCookie, plus a record of which cookies a route cleared, so a test
// can assert both what was read and whether the referral cookie was consumed.
/* eslint-disable @typescript-eslint/no-explicit-any */

let jar = new Map<string, string>();
export const cookieClears: string[] = [];

export function __setCookie(name: string, value: string): void {
  jar.set(name, value);
}

export function __resetCookies(): void {
  jar = new Map();
  cookieClears.length = 0;
}

/** True if the route asked the browser to drop this cookie (maxAge 0 / empty). */
export function wasCleared(name: string): boolean {
  return cookieClears.includes(name);
}

export function cookies() {
  return {
    get(name: string) {
      return jar.has(name) ? { name, value: jar.get(name) as string } : undefined;
    },
    set(name: string, value: string, opts?: { maxAge?: number }) {
      if (value === "" || opts?.maxAge === 0) {
        jar.delete(name);
        cookieClears.push(name);
      } else {
        jar.set(name, value);
      }
    },
    delete(name: string | { name: string }) {
      const n = typeof name === "string" ? name : name.name;
      jar.delete(n);
      cookieClears.push(n);
    },
  };
}
