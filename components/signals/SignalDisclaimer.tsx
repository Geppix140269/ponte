import { Icon } from "@/components/icons";
import { SIGNAL_BADGE, SIGNAL_DISCLAIMER } from "@/lib/market-signals/copy";

/**
 * The mandatory "not verified" notice a Market Signal must carry (brief 1.2).
 *
 * The exact strings live in lib/market-signals/copy.ts, imported here, so the
 * badge's em dash never lands in a components/ file that check-encoding.mjs
 * would reject. This component is only the presentation.
 *
 *   - `full` shows the badge and the full paragraph. Used above a board and
 *     near a detail title, where the reader is deciding whether to trust it.
 *   - the compact form (badge only) is what a card carries, so the label
 *     travels with every signal without the paragraph repeating on each card.
 */
export default function SignalDisclaimer({
  full = false,
  className = "",
}: {
  full?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-glass border border-hairline-strong bg-white/[0.03] p-3.5 ${className}`}
      role="note"
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.6px] text-slate">
        <Icon name="scan" size={13} className="text-muted" />
        {SIGNAL_BADGE}
      </p>
      {full && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {SIGNAL_DISCLAIMER}
        </p>
      )}
    </div>
  );
}
