import type { ReactNode } from "react";
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";
import "@/components/ponte/state/state.css";
import "@/components/deal-room/deal-room.css";

/**
 * The Deal Room shell.
 *
 * Stylesheets only. The feature flag and the organisation allowlist are checked
 * in each page rather than here, for one reason that matters: the invitation
 * landing and the admission checklist are reached by somebody who is not
 * allowlisted and may not yet have an account at all. A layout-level gate would
 * lock the invitee out of the invitation.
 *
 * The two bridge stylesheets are imported in the same order as the landing and
 * the Products intake: the approved source first, unmodified, then the
 * integration additions.
 *
 * Nothing here touches global navigation, the header, authentication or the
 * temporary site access wall in `middleware.ts`.
 */
export default function DealRoomLayout({ children }: { children: ReactNode }) {
  // Two elements, not one: `.dr-page` carries the Ponte paper surface across
  // the full width and the full document height, and `.dr` is the width-limited
  // reading column inside it. The visual evidence of 29 July 2026 found every
  // Deal Room surface rendering ink-on-obsidian because nothing painted the
  // background, and then found a black band below the fold when a fixed layer
  // was tried instead.
  return (
    <div className="dr-page">
      <div className="dr">{children}</div>
    </div>
  );
}
