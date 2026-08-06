"use client";

import Frame, { Action, Retention, Secondary } from "./Frame";
import { useOtp } from "@/lib/auth/use-otp";
import { SAVED_ANONYMOUS, SAVED_SIGNED_IN } from "@/lib/publish/retention";

/**
 * `B08` Light account gate.
 *
 * Specification: `docs/ponte/design-reference/ponte-set1-screens.js`, pattern 3,
 * six states.
 *
 * ## One correction to the reference, and it is not optional
 *
 * Set 1 draws an email field and a PASSWORD field, with "Create an account" and
 * "Send me a sign-in link" beneath. Ponte has none of those. It is a six-digit
 * code, there is no password to hold, there is no separate account-creation
 * flow (a first-time address and a returning one both receive a code), and
 * there is no link (`lib/auth/use-otp.ts` documents why: a magic link put the
 * session in a URL fragment nothing ever read, and a member ended up acting as
 * whoever was signed in on that machine before them).
 *
 * Building the reference's markup literally would have drawn three controls
 * that cannot work. The surface below is the same pattern (statement, lede,
 * fields, retention note, alternatives) carrying the mechanism Ponte actually
 * has.
 *
 * ## The draft survives the round trip
 *
 * There is no round trip. That is the point of the code: the member never
 * leaves this surface, so the flow's state is still in memory when the session
 * is established, and `onVerified` continues from the exact node rather than
 * restoring from storage and hoping.
 *
 * ## The wall
 *
 * The member has done real work by the time they reach this. The statement says
 * their listing is written and waiting, and the retention note says what
 * signing in changes, because the honest answer to "why should I?" is a
 * concrete one: seven days in this browser becomes ninety days on any device.
 */

export interface AccountGateProps {
  /** A one-line description of the record, so the member sees what is waiting. */
  summary: string | null;
  onBack: () => void;
  /** The session is established. Continue from where the member was. */
  onVerified: () => void;
  /** Keep working without signing in. Publication still requires an account. */
  onSkip: () => void;
}

export default function AccountGate({ summary, onBack, onVerified, onSkip }: AccountGateProps) {
  const otp = useOtp({ onVerified });
  const sending = otp.status === "sending";
  const verifying = otp.status === "verifying";

  return (
    <Frame
      screen="B08"
      stage={5}
      back="Preview"
      onBack={onBack}
      pending={sending || verifying}
      phase={otp.step}
      footer={
        otp.step === "email" ? (
          <>
            <Action
              label={sending ? "Sending your code…" : "Email me a code"}
              sub={otp.email.trim() === "" ? "Your address, and nothing else" : null}
              disabled={sending}
              onClick={() => otp.requestCode(otp.email)}
            />
            <Retention sentence={SAVED_ANONYMOUS} />
          </>
        ) : (
          <>
            <Action
              label={verifying ? "Checking…" : "Continue to publication"}
              sub={otp.code.length === 6 ? null : "Six digits from the email"}
              disabled={otp.code.length !== 6 || verifying}
              onClick={() => otp.verify(otp.code)}
            />
            <Secondary label="Send a new code" onClick={() => otp.requestCode(otp.email, true)} />
          </>
        )
      }
    >
      {summary && (
        <div className="resume">
          <span className="lab">Waiting for you</span>
          <b>{summary}</b>
          <span className="id">Not published, and not shown to anyone</span>
        </div>
      )}

      <div className="pb__pad" style={{ paddingBottom: 20 }}>
        <h1 className="stmt">
          {otp.step === "email"
            ? "Sign in to publish this listing."
            : "Six digits, and you are back where you were."}
        </h1>
        <p className="prose" style={{ marginTop: 10 }}>
          {otp.step === "email"
            ? "Your listing is written and waiting. Signing in publishes it and keeps it with you."
            : `Sent to ${otp.email}. You land back on the listing, not on a home page.`}
        </p>
      </div>

      <div className="si__f">
        {otp.step === "email" ? (
          <label className={otp.errorKind ? "bad" : undefined}>
            <span className="lab">
              {otp.errorKind ? "Email: Ponte could not send a code" : "Email"}
            </span>
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
          <label className={otp.errorKind ? "bad" : undefined}>
            <span className="lab">
              {otp.errorKind === "expired"
                ? "Code: that one has expired"
                : otp.errorKind === "wrong"
                  ? "Code: that does not match"
                  : otp.errorKind === "mismatch"
                    ? "Code: the session did not match this address"
                    : "Six-digit code"}
            </span>
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
      </div>

      {/*
        The retention promise, as the reason rather than as small print. Both
        sentences, because the decision the member is making is between them.
      */}
      <div className="store">
        <span className="mk mk--inferred" />
        <span>
          <b>{SAVED_ANONYMOUS}</b>
          <span>{SAVED_SIGNED_IN}</span>
        </span>
      </div>

      <div className="alt">
        {otp.step === "code" && (
          <button type="button" onClick={otp.backToEmail}>
            Use a different email
            <span className="go">›</span>
          </button>
        )}
        <button type="button" onClick={onSkip}>
          Keep working without signing in
          <span className="go">›</span>
        </button>
      </div>

      {otp.notice === "switched" && (
        <div className="pb__pad" style={{ padding: "16px 20px 0" }}>
          <p className="note">
            A different account was signed in on this browser. It has been signed out, so this
            listing will belong to the address above and to nobody else.
          </p>
        </div>
      )}
      {otp.errorDetail && (
        <div className="pb__pad" style={{ padding: "16px 20px 0" }}>
          <p className="note">{otp.errorDetail}</p>
        </div>
      )}
    </Frame>
  );
}
