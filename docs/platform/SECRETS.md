# Secrets inventory

**This file never contains a secret value.** It records that a credential
exists, what it unlocks, where the real value lives, and when it was last
rotated. That is what makes it safe to keep in the repository.

Storing real passwords or API keys in a git repository would be the single
fastest way to lose control of the platform. A repository is cloned, bundled,
mirrored and backed up, and history is permanent: deleting a key in a later
commit does not remove it from history. Anyone who ever had read access keeps
a copy. Treat every value below as belonging in a password manager only.

## Where values actually live

| Purpose | Location |
|---|---|
| Local development | `.env.local` in the working copy. Git ignored. Never committed. |
| Production | The hosting provider's environment variables, set through its dashboard |
| Master copy, for humans | A password manager (1Password, Bitwarden or similar) |

## Inventory

Status is about the record, not the value. "Rotate" means the value should be
replaced at the provider and updated in both the password manager and the host.

| Key | Unlocks | Blast radius if leaked | Rotate at | Last rotated |
|---|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access, bypasses row level security | Total. Read and write every user record. | Supabase dashboard, Project settings, API | Unknown, see actions |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client access, constrained by RLS | Low. Designed to be public. | Supabase dashboard | n/a |
| `NEXT_PUBLIC_SUPABASE_URL` | Project endpoint | None. Public by design. | n/a | n/a |
| `STRIPE_SECRET_KEY` | Charge cards, read payments, issue refunds | Severe. Financial. | Stripe dashboard, Developers, API keys | Unknown |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook authenticity | Medium. Forged payment events. | Stripe dashboard, Webhooks | Unknown |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client side checkout | None. Public by design. | Stripe dashboard | n/a |
| `RESEND_API_KEY` | Send email as the Ponte domain | High. Sender reputation and phishing in your name. | Resend dashboard, API keys | Unknown |
| `OPENAI_API_KEY` | Model calls billed to the account | Medium. Financial, metered. | OpenAI dashboard | Unknown |
| `ANTHROPIC_API_KEY` | Model calls billed to the account | Medium. Financial, metered. | Anthropic console | Unknown |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google sign in | None. Public by design. | Google Cloud console | n/a |
| Supabase personal access token | Management API for the Supabase account | High. Account level, not just this project. | Supabase account settings | Unknown |
| GitHub account | The source of truth itself | Total. The platform. | GitHub settings | n/a |
| Domain registrar | DNS for ponte.trade | Total. Mail and traffic can be redirected. | Registrar account | n/a |

## Open actions

These came out of the 21 July 2026 audit.

1. **`.env.local` sits inside a cloud synced folder.** The working copy lives
   under OneDrive, so twelve live production secrets are uploaded to Microsoft,
   present on every device signed into that account, and retained in OneDrive
   version history and recycle bin. Until the working copy is moved outside the
   synced folder, treat these keys as exposed to anyone with access to that
   OneDrive account.
2. **A second `.env.local` with eighteen populated keys** was found in a
   retired clone at `C:\Users\gfuna\GitHub\ponte`. Nobody maintains it, so
   nobody rotates it. Remove it, and rotate anything it held.
3. **A Supabase personal access token in plain text** at
   `C:\Users\gfuna\supabase_pat.txt`. Move the value into the password manager
   and delete the file.
4. **Rotation dates are unknown for every key above.** After the moves in 1 to
   3, rotate the high blast radius keys once and record the date here, so there
   is a known good baseline.
5. **Turn on two factor authentication** for GitHub, the domain registrar,
   Stripe, and Supabase, if not already on. Those four are the accounts where a
   takeover ends the business rather than inconveniencing it.

## Good news from the same audit

No real credential has ever been committed to this repository. `.gitignore`
covers `.env` and `.env*.local`, the only env file in git history is
`.env.example`, which holds key names and no values, and a scan of every
tracked file across all branches found no key shaped strings. The exposure is
entirely on the local machine, not in the repository.
