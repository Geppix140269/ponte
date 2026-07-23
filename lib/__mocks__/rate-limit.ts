// Test double for @/lib/rate-limit: always allow, fixed IP.
export function checkRateLimit(): boolean {
  return true;
}

export function getClientIp(): string {
  return "127.0.0.1";
}
