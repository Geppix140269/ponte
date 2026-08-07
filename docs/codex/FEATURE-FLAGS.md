# Feature flags

**Reconciled:** 7 August 2026 (previously 25 July 2026)

> **Reconciled to the code by ADR-0040, 7 August 2026.** Two rows in the table
> below described `NEXT_PUBLIC_DEAL_ROOM` and `DEAL_ROOM_ALLOWLIST` as failing
> **closed**. `lib/deal-room/flags.ts` inverted both on 1 August 2026 and
> documented the inversion in its own header: **absent now means on, and an
> empty allowlist now means everybody.** The document was wrong, not the code,
> and it is corrected here rather than the code being changed to match it.
>
> The owner's ruling (OD-E) is that **Deal Room explanation and discovery may
> fail open**, because ADR-0036 permits the room to be publicly named and
> explained. **Protected commercial actions may not rely on a flag**: entering a
> real room, seeing a real counterparty or real evidence, invitation, admission,
> activation and payment depend on authentication, permissions and RLS.
>
> **A rollout flag is not a security boundary and must never be used as one.**

| Flag | Code behaviour | Default when absent | Production value | Safe disable |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIND_JOURNEY` | **Governs no destination since Issue #130 cutover PR 5.** The gateway Find intent opens `/find` in every flag state. Its fallback was the obsidian `/marketplace` board, which is retired and is now a permanent 308 to `/find` | Irrelevant | Irrelevant: `lib/landing/routing.ts` no longer reads it | **None, and none is needed.** There is no earlier surface to fall back to; a change to the Find journey is a change to `/find`. |
| `NEXT_PUBLIC_STRUCTURE_JOURNEY` | **Governs no destination since Issue #130 cutover PR 3.** A Structure intent opens `/structure` in every flag state. Its fallback was `/marketplace/new?type=requirement`, itself a redirect to `/structure` since LB-013, so the flag chose between arriving directly and arriving through a hop that discarded the member's captured intent, product and company | Irrelevant | Irrelevant: `lib/landing/routing.ts` no longer reads it, so whichever value the deployment host holds, behaviour is identical. **No production flag change was needed to complete the cutover** | **None, and none is needed.** There is no earlier composer to fall back to; a change to the Structure journey is a change to `/structure`. |
| `NEXT_PUBLIC_CHECK_JOURNEY` | `on` routes a Check intent to `/check`; otherwise to `/verify?for=counterparty` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; the counterparty handoff returns to `/verify`. |
| `NEXT_PUBLIC_DEAL_ROOM` | Exposes the `/deal-rooms` routes. **Since 1 August 2026 the default is inverted: absent means ON.** Set it to `off` to withdraw the routes. `/deal-rooms/inside` is public and unflagged (ADR-0036) | **On** | Not set, and therefore **on**. The earlier claim that the slice "has never been activated in production" is withdrawn as inaccurate | Set to `off` and redeploy. Nothing else changes: see below. |
| `DEAL_ROOM_ALLOWLIST` | Server-only. Comma-separated organisation or profile ids permitted to reach the Deal Room. **Since 1 August 2026 the default is inverted: empty or absent means EVERYBODY.** Populate it to narrow access | **Everybody** | Not set, and therefore everybody | Populate it to narrow; clearing it widens. |
| `DEAL_ROOM_BILLING` | Server-only. `on` is one of **four** conditions `chargingEnabled()` requires before Ponte may create a Deal Room charge; see below | **Off** | **Not set. Ponte has never taken a Deal Room payment** | Unset it. No charge can be created, and nothing else changes: no surface reads it. |

## The charging gate needs four things, and has none of them

`lib/deal-room/charging.ts` will not create a charge unless **all four** hold:

1. `DEAL_ROOM_BILLING === "on"` — the charging switch;
2. `NEXT_PUBLIC_DEAL_ROOM === "on"` — billing for a product nobody can reach is a
   contradiction, so this makes it an impossible one;
3. `STRIPE_SECRET_KEY` present;
4. `STRIPE_WEBHOOK_SECRET` present.

The fourth gates **checkout**, not only fulfilment, and that is deliberate: a
charge that could not be verifiably confirmed must never be started. Gating
checkout on the secret key alone would trade a member's money for a log line.

`DEAL_ROOM_BILLING` has **no** `NEXT_PUBLIC_` prefix, so unlike the Deal Room
routing flag it is never inlined into the browser bundle and cannot be read or
set by a client. Anything other than exactly `on` is off.

Setting any of these is an owner action under authority §20 and Stage 9 of
`docs/plans/active/deal-room-transaction-pricing.md`. Note that turning all four
on would still charge nobody today: the tables the billing records need are in
`20260731e`, which is **written and not applied**, and no route calls the
charging module at all.

## Rollout flags are not security boundaries (ADR-0040)

Every flag in this table is a **rollout control**. It expresses staging intent —
whether a surface is offered — and nothing about entitlement.

**The boundary is authentication, permissions and Row Level Security.** Where a
flag is the only thing standing between a member and protected data or a
chargeable act, that is a defect in the protected thing and must be recorded as
one. Do not harden the flag and call it fixed.

`lib/deal-room/permissions.ts` states of itself that it is not a security
boundary and that RLS is. That statement is correct, and ADR-0040 makes it
authority.

## The Deal Room flag is a routing control, not a security boundary

`NEXT_PUBLIC_DEAL_ROOM` is a `NEXT_PUBLIC_*` variable, so its value is inlined
into the client bundle and readable by anyone. It decides whether the routes
exist for a visitor and nothing else.

Row Level Security is the boundary. Turning the flag on for the wrong person
shows them an empty portfolio, because every Deal Room policy returns zero rows
to a non-participant. That is the property that makes a public flag safe here.

`DEAL_ROOM_ALLOWLIST` has no `NEXT_PUBLIC_` prefix, is never shipped to the
browser, and is checked in every Deal Room server route and command handler. It
is a staged-rollout control: an allowlisted member still sees only their own
rooms.

**The paragraph above remains true and is now the reason the open default is
safe.** RLS returns zero rows to a non-participant whatever the flag says, which
is why ADR-0040 permits discovery to fail open while participation cannot.

**Safe disable.** Turning `NEXT_PUBLIC_DEAL_ROOM` off removes the slice and
regresses nothing, by construction rather than by care: the Deal Room adds only
new routes and new `deal_room_*` tables, and alters no existing table, column,
policy, route or journey. With the flag off there is nothing left of it but rows
nobody can reach. Existing Deals and every upstream journey behave identically
either way.

The flags are evaluated at build time because they are `NEXT_PUBLIC_*` variables. Changing them requires a new deployment.

**Updated 31 July 2026.** Production moved from Netlify to Vercel
(`docs/operations/OPERATIONS_LOG.md`). The build-time rule is unchanged - it is a
property of `NEXT_PUBLIC_*` in Next, not of the host - but two things around it
are. The dashboard the values live in is now Vercel's, and **a push no longer
triggers a build on its own**: deployment is explicitly controlled and
owner-held until the Vercel procedure is confirmed. So "set it and redeploy" in
this table now means two separate acts, and the second is not automatic.

"Unknown - must be checked in the deployment host" was already the honest answer
for the production value of three of these flags. It still is, and the host it
refers to has changed.

They govern the entrance's interpreted searches, and the Start a deal bridge route, through `destinationFor` in `lib/landing/routing.ts`, which remains the only place a destination is decided. `lib/landing/bridge.ts` maps the two North Star routes onto it and adds no flag of its own.

`/explore` has no flag. It is a new public route with no legacy seam to fall back to, and nothing behind it that a flag could safely disable; removing it would mean removing the Explore entrance itself.

Recorded 25 July 2026: `NEXT_PUBLIC_CHECK_JOURNEY` was already read by `lib/landing/routing.ts` but was missing from this table. Documented here rather than changed.

Do not describe Find or Structure as live until the production values and deployed routes have been checked directly.
