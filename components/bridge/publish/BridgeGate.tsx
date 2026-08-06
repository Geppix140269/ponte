"use client";

import BridgeShell, { BridgeAction, BridgeSecondary } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import { useOtp } from "@/lib/auth/use-otp";
import { SAVED_ANONYMOUS, SAVED_SIGNED_IN } from "@/lib/publish/retention";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B08` Light account gate, on the bridge system.
 *
 * ## One correction to the reference, and it is not optional
 *
 * Set 1 draws an email field and a PASSWORD field, with "Create an account" and
 * "Send me a sign-in link" beneath. Ponte has none of those. It is a six-digit
 * code, there is no password to hold, there is no separate account-creation flow
 * (a first-time address and a returning one both receive a code), and there is
 * no link: `lib/auth/use-otp.ts` documents why, which is that a magic link put
 * the session in a URL fragment nothing ever read, and a member ended up acting
 * as whoever was signed in on that machine before them.
 *
 * Building the reference's markup literally would have drawn three controls that
 * cannot work. This is the same pattern carrying the mechanism Ponte has.
 *
 * ## The draft survives the round trip
 *
 * There is no round trip. That is the point of the code: the member never leaves
 * this surface, so the flow's state is still in memory when the session is
 * established, and `onVerified` continues from the exact node rather than
 * restoring from storage and hoping.
 *
 * ## The wall
 *
 * The member has done real work by the time they reach this, and the ledger
 * below is that work, visible while they decide. The honest answer to "why
 * should I?" is a concrete one: seven days in this browser becomes ninety days
 * on any device.
 */

export interface BridgeGateProps {
  /** A one-line description of the record, so the member sees what is waiting. */
  summary: string | null;
  family: MarketFamily | null;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onBack: () => void;
  /** The session is established. Continue from where the member was. */
  onVerified: () => void;
  /** Keep working without signing in. Publication still requires an account. */
  onSkip: () => void;
}

export default function BridgeGate({
  summary,
  family,
  ledger,
  signals,
  who = null,
  onBack,
  onVerified,
  onSkip,
}: BridgeGateProps) {
  const otp = useOtp({ onVerified });
  const sending = otp.status === "sending";
  const verifying = otp.status === "verifying";
  const onEmail = otp.step === "email";

  const codeLabel =
    otp.errorKind === "expired"
      ? "Code: that one has expired"
      : otp.errorKind === "wrong"
        ? "Code: that does not match"
        : otp.errorKind === "mismatch"
          ? "Code: the session did not match this address"
          : "Six-digit code";

  return (
    <BridgeShell
      screen="B08"
      phase={otp.step}
      node="gate"
      family={family}
      // Always false here: this node exists only for a member who is not signed
      // in, and asking `signedIn` of the path while standing on it would remove
      // the node the member is looking at.
      signedIn={false}
      progress={onEmail ? 0 : 0.5}
      question={
        onEmail ? "Sign in to publish this listing." : "Six digits, and you are back where you were."
      }
      eyebrow={summary ? "Waiting for you" : "Sign in"}
      note={
        onEmail
          ? "Your listing is written and waiting. Signing in publishes it and keeps it with you."
          : `Sent to ${otp.email}. You land back on the listing, not on a home page.`
      }
      back={{ label: "Preview", onBack }}
      ledger={ledger}
      /*
        No retention line under the ledger HERE, and only here.

        Every other surface footnotes the promise. This surface argues from it:
        the two sentences are the decision the member is making, so they are the
        body. Leaving the shell's footnote on as well printed the anonymous
        sentence twice and the signed-in one once, three retention statements on
        one screen, which reads as insistence rather than as an answer.
      */
      retention={null}
      signals={signals}
      who={who}
      actions={
        onEmail ? (
          <>
            <BridgeAction
              label={sending ? "Sending your code" : "Email me a code"}
              sub={otp.email.trim() === "" ? "Your address, and nothing else" : null}
              disabled={sending}
              onClick={() => otp.requestCode(otp.email)}
            />
            <BridgeSecondary label="Keep working without signing in" onClick={onSkip} />
          </>
        ) : (
          <>
            <BridgeAction
              label={verifying ? "Checking" : "Continue to publication"}
              sub={otp.code.length === 6 ? null : "Six digits from the email"}
              disabled={otp.code.length !== 6 || verifying}
              onClick={() => otp.verify(otp.code)}
            />
            <BridgeSecondary
              label="Send a new code"
              onClick={() => otp.requestCode(otp.email, true)}
            />
            <BridgeSecondary label="Use a different email" onClick={otp.backToEmail} />
          </>
        )
      }
    >
      {summary && (
        <div className="brg-report__held" style={{ marginBlockEnd: 8 }}>
          <b>{summary}</b>
          <span style={{ display: "block", opacity: .7, marginBlockStart: 6 }}>
            Not published, and not shown to anyone.
          </span>
        </div>
      )}

      {onEmail ? (
        <label className="brg-field" data-bad={otp.errorKind ? "true" : undefined}>
          <span>{otp.errorKind ? "Email: Ponte could not send a code" : "Email"}</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={otp.email}
            onChange={(event) => otp.setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !sending) otp.requestCode(otp.email);
            }}
          />
        </label>
      ) : (
        <label className="brg-field" data-bad={otp.errorKind ? "true" : undefined}>
          <span>{codeLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={otp.code}
            onChange={(event) => otp.setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </label>
      )}

      {/*
        The retention promise as the REASON rather than as small print. Both
        sentences, because the decision the member is making is between them.
      */}
      <div className="brg-report__held" style={{ marginBlockStart: 34 }}>
        <div className="brg-eyebrow">What signing in changes</div>
        <p style={{ marginBlockStart: 10 }}>{SAVED_ANONYMOUS}</p>
        <p style={{ marginBlockStart: 6 }}>{SAVED_SIGNED_IN}</p>
      </div>

      {otp.notice === "switched" && (
        <p className="brg-note" style={{ marginBlockStart: 18 }}>
          A different account was signed in on this browser. It has been signed out, so this
          listing will belong to the address above and to nobody else.
        </p>
      )}
      {otp.errorDetail && (
        <p className="brg-note" style={{ marginBlockStart: 18 }}>
          {otp.errorDetail}
        </p>
      )}
    </BridgeShell>
  );
}
