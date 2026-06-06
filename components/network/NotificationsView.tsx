"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead, type NotificationRow } from "@/lib/network/notifications";

export function NotificationsView({ initial }: { initial: NotificationRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();

  const open = (n: NotificationRow) => {
    if (!n.read) { setRows((r) => r.map((x) => (x.id === n.id ? { ...x, read: true } : x))); start(() => markNotificationRead(n.id).then(() => {})); }
    if (n.link) router.push(n.link);
  };
  const allRead = () => { setRows((r) => r.map((x) => ({ ...x, read: true }))); start(() => markAllNotificationsRead().then(() => {})); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="serif text-ink" style={{ fontSize: 28, fontWeight: 500 }}>Notifications</h1>
        {rows.some((r) => !r.read) && <button disabled={pending} onClick={allRead} className="badge">Mark all read</button>}
      </div>
      <div className="glass divide-y divide-rule">
        {rows.map((n) => (
          <button key={n.id} onClick={() => open(n)} className="w-full text-left p-4 flex items-start gap-3 hover:bg-black/5">
            <span className={`mt-1.5 h-2 w-2 rounded-full ${n.read ? "bg-transparent" : "bg-gold"}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] ${n.read ? "text-gray-2" : "text-ink font-medium"}`}>{n.title}</p>
              {n.body && <p className="text-[12px] text-gray-2">{n.body}</p>}
            </div>
            <span className="text-[11px] text-gray-2 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
          </button>
        ))}
        {rows.length === 0 && <div className="p-10 text-center text-gray-2">No notifications yet.</div>}
      </div>
    </div>
  );
}
