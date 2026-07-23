// Test double for next/navigation. redirect throws, exactly as Next's does, so
// a server action's control flow (finish -> redirect) is observable: the test
// catches the RedirectError and reads the destination.
export class RedirectError extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}

export function redirect(url: string): never {
  throw new RedirectError(url);
}
