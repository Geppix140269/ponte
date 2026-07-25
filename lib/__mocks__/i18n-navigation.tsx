// Test double for the locale-aware navigation helpers in @/i18n/navigation.
// The router records every push, so a test can read exactly where a component
// sent the visitor without a browser.

import { createElement, type ReactNode } from "react";

export const pushed: string[] = [];

export function resetRouter(): void {
  pushed.length = 0;
}

export function useRouter() {
  return {
    push: (href: string) => {
      pushed.push(href);
    },
    replace: (href: string) => {
      pushed.push(href);
    },
    prefetch: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
  };
}

export function Link(props: { href: string; children?: ReactNode } & Record<string, unknown>) {
  return createElement("a", props);
}

export function usePathname(): string {
  return "/";
}

export function getPathname({ href }: { href: string }): string {
  return href;
}

export function redirect(href: string): void {
  pushed.push(href);
}
