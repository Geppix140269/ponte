// True for trade-platform routes that should use the network chrome
// (header + footer) instead of the report-store chrome.
export function isPlatformRoute(pathname: string): boolean {
  return (
    pathname === "/network" ||
    pathname.startsWith("/network/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/admin")
  );
}
