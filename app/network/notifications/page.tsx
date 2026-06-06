import type { Metadata } from "next";
import { listMyNotifications } from "@/lib/network/notifications";
import { NotificationsView } from "@/components/network/NotificationsView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const rows = await listMyNotifications();
  return (
    <section className="container-px py-12 max-w-3xl mx-auto">
      <NotificationsView initial={rows} />
    </section>
  );
}
