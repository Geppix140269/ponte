// Test double for @/lib/auth. The test sets the current user before invoking a
// route or action; null means signed out.
type MockUser = { id: string; email?: string } | null;

let current: MockUser = null;

export function __setUser(u: MockUser): void {
  current = u;
}

export async function getUser(): Promise<MockUser> {
  return current;
}

export function isSupabaseConfigured(): boolean {
  return true;
}
