# Seeing your work, and finding the design before you build

Two things cost this project a working day on 1 August 2026. Both were
avoidable and neither was a code problem.

## 1. Run the checks here, not in CI

```bash
npm run check
```

**7 seconds.** It is the static half of `npm run verify`: dependencies,
messages, encoding, migrations, governance, launch mode, contrast, token
adoption, bridge invariance, the verification-level guard, and `tsc`.

The same run in CI takes about six minutes, and on 1 August it failed three
times in a row on an em dash in a comment, a hand-authored SVG icon, and a
colour literal that should have been a token. Every one would have surfaced
here instantly.

`.githooks/pre-push` now runs it automatically. `git push --no-verify` skips it
when you mean to.

`npm run verify` is still the full gate, and CI still runs it. This is the part
that keeps failing, made cheap.

## 2. Look at the page

Three separate things stop a Ponte page from rendering locally, and each has a
different answer.

**The production-database guard.** `npm run dev` refuses when the environment
points at production, because a dev server holds a service-role key and
`/admin/listings` writes rows on page load. Use:

```bash
npm run dev:audit
```

It forces a synthetic Supabase project in the child process, so the server
cannot reach production at all. Lists render their honest "sources could not be
read" state, which is correct for checking layout, copy and empty states.

The guard reads `process.env` last, so on a machine that already carries
production Supabase variables, editing `.env.local` cannot satisfy it. That is
why the override lives in the script rather than in a file.

**Real data.** `dev:audit` cannot show real Market Signals: the `desk_radar`
table has RLS enabled with no policies, so only the service role can read it.
Options, in order of preference:

1. Add a policy letting `anon` read already-public signals. Then the anon key
   is enough and no secret has to travel. This is the right fix.
2. Add the Supabase variables to Vercel's **Preview** environment, so every
   pull-request preview shows real data.
3. `PONTE_ALLOW_PRODUCTION_DB=i-understand npm run dev` — a real production
   connection with a service-role key. Never open `/admin` while it runs.

**The site gate.** `middleware.ts` puts Basic auth over everything, including
localhost and previews, as user `ponte`. Only the SHA-256 verifier is
committed. The password is a personal environment variable,
`PONTE_SITE_PASSWORD`; ask the owner if you do not have it. Never weaken or
remove the gate to capture evidence.

```bash
curl --location-trusted -u "ponte:$PONTE_SITE_PASSWORD" https://ponte.trade/en
```

Static `.html` files under `public/` bypass the locale middleware, so a
self-contained page dropped in `public/preview/` renders without the gate.
`.css` and `.js` do **not** — they get locale-rewritten to a 404, so inline
them.

## 3. Read the design before building

The owner's design package is **not in this repository**. It is
`Ponte trade Deal Room.zip` in the owner's Dropbox, and it is also the
claude.ai design project `Ponte trade`, readable through the DesignSync tool:

```
projectId cad4950a-c95c-45f7-92a7-6d8ab2b53853
```

It contains 682 files, including the approved landing compositions and a
39-screen Deal Room review with its own written recommendations. Before
designing any Ponte surface, look there.

What that would have saved on 1 August: the landing Deal Room integration was
built twice from guesswork, when
`Ponte Deal Room - Design Review v3.html`, deliverable I, already recorded the
answer and the reasoning:

> **Option A, the destination node.** "The Action Bridge's right abutment
> already existed and already read 'Structured journey' — relabelling it
> 'Private Deal Room' is the smallest possible change with the largest gain in
> meaning, because the member is looking at that deck at the moment they
> decide."

The rule this leaves behind: **an owner decision that exists only in a
conversation will be lost.** If it matters, it belongs in `docs/decisions/` as
an ADR, and the ADR should say what must REMAIN, not only what to remove.
