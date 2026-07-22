// Thin Telegram Bot API wrapper for ops notifications.
//
// Setup (one-time, free):
//   1. On Telegram, open @BotFather, /newbot, follow prompts, copy the bot token
//   2. Start a chat with your bot (search by username, /start)
//   3. To get your chat ID: send any message to the bot, then visit
//      https://api.telegram.org/bot<TOKEN>/getUpdates
//      Look for "chat":{"id":NNNNNN,...} — that NNNNNN is your chat ID.
//   4. In the Vercel project env, set:
//        TELEGRAM_BOT_TOKEN=<token from BotFather>
//        TELEGRAM_OPS_CHAT_ID=<your chat ID>
//
// All functions are no-ops if either env var is missing, so dev environments
// without Telegram still work. Failures are logged and swallowed so they
// never break the customer-facing flow.

const BASE = "https://api.telegram.org";

function isConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_OPS_CHAT_ID,
  );
}

/**
 * Send a plain-text or Markdown message to the ops Telegram chat.
 *
 * Markdown is parsed using Telegram's MarkdownV2 dialect. Special characters
 * in user-supplied content must be escaped with escapeMd() before being
 * included. Bot messages from us only — keep them short, scannable.
 */
export async function sendTelegramOpsMessage(
  text: string,
  opts: { parseMode?: "MarkdownV2" | "HTML" | undefined } = {},
): Promise<void> {
  if (!isConfigured()) return;
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID!;
  try {
    const res = await fetch(`${BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts.parseMode,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[ponte] telegram sendMessage failed:", res.status, body);
    }
  } catch (err) {
    console.warn("[ponte] telegram sendMessage error:", err);
  }
}

/**
 * Escape user-supplied content for Telegram MarkdownV2.
 * See: https://core.telegram.org/bots/api#markdownv2-style
 */
export function escapeMd(s: string): string {
  return s.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
