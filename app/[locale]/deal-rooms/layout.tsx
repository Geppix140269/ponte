import type { ReactNode } from "react";
import DeskShell from "@/components/desk/DeskShell";
import PonteFooter from "@/components/PonteFooter";
import "@/components/desk/desk.css";
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";
import "@/components/ponte/state/state.css";
import "@/components/deal-room/deal-room.css";

/**
 * The Deal Room shell.
 *
 * The feature flag and the organisation allowlist are checked in each page
 * rather than here, for one reason that matters: the invitation landing and the
 * admission checklist are reached by somebody who is not allowlisted and may
 * not yet have an account at all. A layout-level gate would lock the invitee
 * out of the invitation.
 *
 * The two bridge stylesheets are imported in the same order as the landing and
 * the Products intake: the approved source first, unmodified, then the
 * integration additions.
 *
 * ## The chrome
 *
 * This used to be stylesheets only, which meant the room inherited whatever the
 * locale layout gave it: the retired obsidian header, with a MARKETPLACE link
 * to a board that was retired in Stage 4. Nobody caught it because the slice
 * was behind a flag nobody had, so no route in the product led here and no
 * screenshot was ever taken of it.
 *
 * It now mounts the Desk, like every other current member surface, and is bared
 * in `ChromeGate` so the two do not stack. `rail={null}`: the journey rail
 * carries a position within a journey, and the room list is not a position. An
 * individual room draws its own progress from its agreed procedure.
 */
export default function DealRoomLayout({ children }: { children: ReactNode }) {
  // Two elements inside the shell, not one: `.dr-page` carries the Ponte paper
  // surface across the full width and the full document height, and `.dr` is
  // the width-limited reading column inside it. The visual evidence of 29 July
  // 2026 found every Deal Room surface rendering ink-on-obsidian because
  // nothing painted the background, and then found a black band below the fold
  // when a fixed layer was tried instead.
  return (
    <div className="ponte-desk">
      <DeskShell rail={null} current="deal">
        <div className="dr-page">
          <div className="dr">{children}</div>
        </div>
      </DeskShell>
      <PonteFooter />
    </div>
  );
}
