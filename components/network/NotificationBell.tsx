"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/lib/network/notifications";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => { getUnreadCount().then(setCount).catch(() => {}); }, []);
  return (
    <Link href="/network/notifications" aria-label="Notifications" className="relative inline-flex p-2 text-gray-2 hover:text-gold">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
