import { Icon } from "@/components/icons";

/**
 * The mandatory "not verified" notice a Market Signal must carry (brief 1.2).
 *
 * The badge and the full disclaimer are passed in, resolved by the caller from
 * the "marketSignals" message namespace, so they localise with the rest of the
 * surface. This component is only the presentation.
 *
 *   - `full` shows the badge and the full paragraph. Used above a board and
 *     near a detail title, where the reader is deciding whether to trust it.
 *   - the compact form (badge only) is what a card carries, so the label
 *     travels with every signal without the paragraph repeating on each card.
 */
export default function SignalDisclaimer({
  badge,
  disclaimer,
  full = false,
  className = "",
}: {
  badge: string;
  disclaimer: string;
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
        {badge}
      </p>
      {full && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {disclaimer}
        </p>
      )}
    </div>
  );
}
