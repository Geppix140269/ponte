"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon, type SystemIconName } from "@/components/icons";

/*
 * The five things a member does on a phone, in the order they do them.
 *
 * This is the primary navigation on mobile: the header keeps the logo, the
 * language and nothing else, and the reading pages (fees, about, legal) live in
 * the footer. Two navigations offering the same links is what makes a mobile
 * site feel like a desktop site squeezed down.
 *
 * Post is the only accented slot. It is the one action that puts something into
 * the market, and on a board with few listings it is the action that matters
 * most. It is flush with the bar rather than a raised circle: the protruding
 * centre button belongs to consumer apps, and this reads as an instrument.
 */
const ITEMS: {
  href: string;
  key: string;
  icon: SystemIconName;
  accent?: boolean;
}[] = [
  { href: "/", key: "home", icon: "home" },
  // marketplaceShort, not marketplace: a slot is a fifth of a phone, and
  // "Place de marché" or "Маркетплейс" would arrive as an ellipsis.
  { href: "/marketplace", key: "marketplaceShort", icon: "board" },
  { href: "/marketplace/new", key: "post", icon: "post", accent: true },
  { href: "/verify", key: "verify", icon: "verify" },
  { href: "/account", key: "account", icon: "user" },
];

// The longest matching href wins, so /marketplace/new lights Post rather than
// the board it lives under. Home matches only itself.
function activeIndex(pathname: string): number {
  let best = -1;
  let bestLength = -1;

  ITEMS.forEach((item, index) => {
    const matches =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && item.href.length > bestLength) {
      best = index;
      bestLength = item.href.length;
    }
  });

  return best;
}

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [hidden, setHidden] = useState(false);

  /*
   * Scrolling down hands the screen back to the content, scrolling up brings
   * the bar straight back. On a dense board that is most of a row of listings
   * recovered. Anyone who has asked their system for less motion keeps the bar
   * pinned, because a bar that moves on its own is exactly what they turned off.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let last = window.scrollY;
    let queued = false;

    const measure = () => {
      queued = false;
      const y = window.scrollY;
      const delta = y - last;
      last = y;

      // Near the top there is nothing to reclaim, so the bar always shows.
      if (y < 96) {
        setHidden(false);
        return;
      }
      if (delta > 8) setHidden(true);
      else if (delta < -8) setHidden(false);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change should never leave the bar hidden off screen.
  useEffect(() => setHidden(false), [pathname]);

  // The admin area has its own navigation and is not part of the installed app.
  if (pathname.startsWith("/admin")) return null;

  const active = activeIndex(pathname);

  return (
    <nav
      className="bottom-nav md:hidden"
      data-hidden={hidden}
      aria-label={t("primaryAriaLabel")}
    >
      <span
        className="bottom-nav-indicator"
        data-visible={active >= 0}
        style={{ "--slot": Math.max(active, 0) } as CSSProperties}
        aria-hidden="true"
      />

      <ul className="grid grid-cols-5">
        {ITEMS.map((item, index) => {
          const isActive = index === active;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="bottom-nav-item"
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.accent ? t("postAriaLabel") : undefined}
              >
                {item.accent ? (
                  <span className="bottom-nav-post">
                    <Icon name={item.icon} size={17} strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className="bottom-nav-icon">
                    <Icon name={item.icon} size={19} />
                  </span>
                )}
                <span className="bottom-nav-label">{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
