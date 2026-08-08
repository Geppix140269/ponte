/**
 * The canonical journey lifecycle, in one place, for every surface that orients
 * a member inside it.
 *
 * ## What this is, and what it replaces
 *
 * `ADR-0038` (owner decision OD-C, 7 August 2026) fixes the sequence:
 *
 *     ENTER -> DISCOVER -> CREATE -> TRUST -> CONNECT -> [DEAL ROOM] -> PROGRESS -> RECORD
 *
 * The controller's ruling of 8 August 2026 makes this the **global orientation
 * vocabulary**, superseding the two Desk-specific station lists for that
 * purpose. Neither of those may be used as the global lifecycle:
 *
 *     R-FIND    Objective, Discover, Record, Act
 *     R-SUBMIT  Objective, Compose, Preview, Conclude
 *
 * They remain `lib/desk/journey.ts`'s own contract for the Desk surfaces that
 * already render them. This module does not touch them, and a surface reads one
 * or the other, never both.
 *
 * ## Two rules that are easy to break by accident
 *
 * **`MANAGE` is not a stage.** ADR-0038 removes it from the sequence: managing a
 * record, a mission or a room happens throughout, so placing it chronologically
 * would tell every member that management stops. It is absent from the type, so
 * it cannot be added by a caller.
 *
 * **`[DEAL ROOM]` is a threshold and an environment, not a compulsory step.**
 * ADR-0038 draws it as a transition rather than a terminus, and ADR-0037 is
 * explicit that convergence on a room is available, never automatic and never
 * obligatory: a journey may end validly at `CONNECT`. `contextual` carries that
 * into the render so the rail cannot quietly become a funnel. A rail must also
 * never present the room as the end, which is why `PROGRESS` and `RECORD`
 * follow it.
 */

export type LifecycleStageKey =
  | "enter"
  | "discover"
  | "create"
  | "trust"
  | "connect"
  | "deal_room"
  | "progress"
  | "record";

export interface LifecycleStage {
  /** Stable key. Never derived from the label. */
  key: LifecycleStageKey;
  /** What a member reads. Cased for reading; the rail sets the typographic case. */
  label: string;
  /**
   * True only for the Deal Room.
   *
   * It means: reachable, and not on every journey. A stage without this flag is
   * part of the lifecycle every journey passes through; a stage with it is one
   * the parties choose to cross into.
   */
  contextual?: boolean;
}

export const LIFECYCLE: readonly LifecycleStage[] = [
  { key: "enter", label: "Enter" },
  { key: "discover", label: "Discover" },
  { key: "create", label: "Create" },
  { key: "trust", label: "Trust" },
  { key: "connect", label: "Connect" },
  { key: "deal_room", label: "Deal Room", contextual: true },
  { key: "progress", label: "Progress" },
  { key: "record", label: "Record" },
];
