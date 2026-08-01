import { Link } from "@/i18n/navigation";

/**
 * The Deal Room, under Market Signals.
 *
 * Owner instruction, 1 August 2026: take it from the design package
 * (`Ponte Landing - Deal Room Integration B.html`), and carry no explanatory
 * text. The four stations are the composition from that file. The prose
 * paragraph, the price line and the free-terms line that sit under them there
 * are omitted: the owner's instruction is that a new member should feel what
 * they can do, not read about it.
 *
 * Three routes out, because those are the three things the owner named a new
 * member must feel are available from the entrance: see what is there, add
 * their own, or open a room and invite someone into it.
 */

const STATIONS = [
  "Three market families",
  "Explore or create an opportunity",
  "Credible commercial interest",
  "Private Deal Room",
] as const;

export default function DealRoomEntry() {
  return (
    <div className="prog">
      <div className="prog__d">
        {STATIONS.map((label, i) => (
          <span
            key={label}
            className={`prog__s${i === 0 ? " prog__s--on" : ""}${
              i === STATIONS.length - 1 ? " prog__s--end" : ""
            }`}
          >
            <i aria-hidden="true" />
            <b>{label}</b>
          </span>
        ))}
      </div>

      <div className="prog__a">
        <Link className="b b--lg" href="/deal-rooms/propose">
          Open a Deal Room
        </Link>
        <Link className="b b--2 b--lg" href="/find">
          See opportunities
        </Link>
        <Link className="b b--2 b--lg" href="/structure">
          Post an offer
        </Link>
      </div>
    </div>
  );
}
