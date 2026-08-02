"use client";

import { useTransition, type ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
// No stylesheet is imported here. The unit tests mount components under `tsx`,
// which has no CSS loader, so a component that pulls CSS cannot be tested. The
// pending and pressed rules therefore live BESIDE the rules that define the
// class they decorate - `.b` in `desk.css`, `.brst` in `bridge-integration.css`
// - which is also the only arrangement where a missing stylesheet is loud: the
// control loses its whole treatment rather than just its state.

/**
 * A link that admits it has been pressed.
 *
 * ## The defect this exists for
 *
 * `/structure` is `force-dynamic` and mounts the whole composer, so a client
 * navigation to it is a blocking round trip. The App Router holds the previous
 * page on screen for the whole of it. Measured on 2 August 2026 from the Deal
 * Room entrance, on a warm dev server: 2,638 ms of a completely unchanged
 * screen between the press and the composer.
 *
 * The design director walked the same path on production, waited past ten
 * seconds, pressed again, and filed the control as dead. It was not dead. It
 * was silent, and from the outside those are the same thing - except that the
 * second press is a second navigation, which makes it slower.
 *
 * ## The two states, and why both
 *
 * **Pressed** is CSS `:active`, which the browser paints at pointer-DOWN with
 * no JavaScript involved at all. It costs nothing and it cannot be late.
 *
 * **Pending** is `useTransition`, which reports the router's own navigation.
 * `isPending` is set in the same batch as the click, so it paints on the next
 * frame, and - this is the part a hand-rolled boolean gets wrong - it goes
 * back to false by itself if the navigation fails. There is no way to leave a
 * control stuck saying "Opening" for a route that never opened.
 *
 * The pending state is announced as well as drawn: `aria-busy` on the control
 * and a `role="status"` word beside it, because "something is happening" has
 * to reach somebody who cannot see the treatment.
 *
 * ## What it is NOT
 *
 * It is not a spinner, and it does not block. The control stays exactly where
 * it is, at exactly its size, so nothing moves under a second press.
 *
 * It is still a real `<a href>`. A visitor whose script has not arrived gets
 * the browser's own navigation, and the browser's own loading indicator, which
 * is the behaviour this whole component is trying to restore.
 *
 * `UnsavedFormGuard` still wins where it applies: it intercepts in the CAPTURE
 * phase and stops propagation, so on a dirty form this handler never runs and
 * the member is still asked before they lose work.
 */
export default function RouteLink({
  href,
  className,
  children,
  pendingLabel = "Opening",
  "aria-label": ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  /** The word shown while the route is being fetched. */
  pendingLabel?: string;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
      onClick={(event) => {
        // A modifier click, a middle click or an already-handled click belongs
        // to the browser or to a guard above us. Leave every one of them alone.
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        // next/link checks `defaultPrevented` after calling this handler, so
        // preventing here hands the navigation to us rather than running both.
        event.preventDefault();
        start(() => router.push(href));
      }}
    >
      {children}
      {pending ? (
        <span className="rlink__p" role="status">
          {pendingLabel}
        </span>
      ) : null}
    </Link>
  );
}
