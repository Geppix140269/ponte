import type { Config } from "@netlify/functions";

// Daily trigger for the sanctions rebuild.
//
// This function holds no logic of its own on purpose: it calls the app route,
// so the screening code lives with the rest of the application and is typed
// and tested there rather than duplicated in a function bundle.

export default async () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";
  const secret = process.env.SANCTIONS_REFRESH_SECRET;

  if (!secret) {
    console.error("SANCTIONS_REFRESH_SECRET is not set, refusing to call the refresh");
    return new Response("not configured", { status: 503 });
  }

  const res = await fetch(`${base}/api/cron/sanctions-refresh`, {
    method: "POST",
    headers: { "x-refresh-secret": secret },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`sanctions refresh returned ${res.status}: ${body.slice(0, 300)}`);
    return new Response(body, { status: res.status });
  }

  console.log(`sanctions refresh ok: ${body.slice(0, 300)}`);
  return new Response(body, { status: 200 });
};

export const config: Config = {
  // Overnight in Europe, when the national feeds are quiet and a long run
  // does not compete with daytime traffic.
  schedule: "0 2 * * *",
};
