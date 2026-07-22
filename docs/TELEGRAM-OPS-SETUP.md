# Telegram Ops Alerts — Setup

5-minute one-time setup. After this, every new authorized order pings you on Telegram.

## What you'll get

Each new order fires a message like:

> *New order* 🟡 CARD HELD
> #a1b2c3d4 — $499.00
> giuseppe@1402celsius.com
> • Geopolitical Scenario Brief (scenario: hormuz, hs_code: 2709)
> Slot: *2026-05-28*
> ⚠️ Capture or void by 2026-06-02 14:23 UTC
>
> [Open admin orders](https://ponte.trade/admin/orders)

Tap the link to confirm/capture/void from your phone.

## Setup

### 1. Create the bot (2 min)

1. On Telegram, search for `@BotFather` and open chat.
2. Send `/newbot`.
3. Pick a display name (e.g. "Ponte Ops") and a username ending in `bot` (e.g. `ponte_ops_bot`).
4. BotFather replies with the token. Looks like `1234567890:AAEAbCdEf...`. Copy it.

### 2. Get your chat ID (1 min)

1. Search Telegram for the bot you just created. Open it and tap `Start` (or send `/start`).
2. Send any message to the bot (e.g. "hello").
3. In a browser, open:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   (replace `<YOUR_TOKEN>` with the token from step 1)
4. Look for `"chat":{"id":NNNNNN,...` in the JSON response. That number is your chat ID. Copy it.

### 3. Drop into Netlify (1 min)

1. Open Netlify → Site → Site configuration → Environment variables
2. Add:
   - `TELEGRAM_BOT_TOKEN` = your bot token from step 1
   - `TELEGRAM_OPS_CHAT_ID` = your chat ID from step 2
   - `OPS_EMAIL` = `ops@ponte.trade` (or any address you want consolidated order alerts to land in)
3. Save. Netlify will redeploy automatically.

### 4. Test

Place a test order in production with a $1 SKU (or use Stripe test mode). Within ~5 seconds you should see the Telegram message appear.

## Troubleshooting

**No message arrives:**
- Check Netlify env vars saved correctly (no trailing spaces)
- Check Netlify build logs for `[ponte] telegram sendMessage failed:` — that tells you what Telegram rejected
- Most common: chat ID is wrong (must be the integer from `chat.id`, not your username)

**Multiple chats / group:**
- For a group chat: add the bot to the group, send a message in the group, then check `getUpdates` for `"chat":{"id":-100NNNNN,...}` (negative ID for groups). Use that.

**Disable temporarily:**
- Remove or blank the `TELEGRAM_BOT_TOKEN` env var. The code is a no-op when token is missing. No error, no message.
