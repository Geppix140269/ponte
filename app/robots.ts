import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";

/**
 * Private surfaces. Applied to every crawler, general or AI.
 *
 * `/dev` is listed because the development galleries render fixtures that look
 * exactly like real records; they already 404 in production, and this states
 * the intent rather than relying on that. `/checkout` and `/order-success` left
 * with the shop; those paths are permanent redirects now, and a redirect needs
 * no crawl rule.
 */
const DISALLOW = ["/account", "/admin", "/workspace", "/dev", "/auth", "/api"];

/**
 * The AI crawlers Ponte explicitly welcomes.
 *
 * Naming them is not redundant beside the `*` rule, for two reasons pulling in
 * different directions:
 *
 *   - `Google-Extended` and `Applebot-Extended` are not crawlers at all. They
 *     are consent tokens: the only thing a site can say through them is whether
 *     its content may inform Gemini and Apple Intelligence. Silence is a
 *     default, and a default is not a decision.
 *   - The rest, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot
 *     and the others, are the agents that answer a buyer who asks an assistant
 *     "who is selling basmati rice out of India". A Market Signals board they
 *     cannot read is invisible in precisely the place trade questions are now
 *     being asked.
 *
 * Each gets the same disallow list as everybody else: welcoming a crawler is not
 * the same as opening a private surface to it.
 */
const AI_AGENTS = [
  "GPTBot",             // OpenAI, training and retrieval
  "OAI-SearchBot",      // OpenAI, ChatGPT search index
  "ChatGPT-User",       // OpenAI, fetch-on-demand when a user asks
  "ClaudeBot",          // Anthropic
  "anthropic-ai",       // Anthropic, legacy token still honoured by some stacks
  "Claude-User",        // Anthropic, fetch-on-demand
  "PerplexityBot",      // Perplexity index
  "Perplexity-User",    // Perplexity, fetch-on-demand
  "Google-Extended",    // Consent token: Gemini and AI Overviews
  "Applebot",           // Apple search
  "Applebot-Extended",  // Consent token: Apple Intelligence
  "meta-externalagent", // Meta AI
  "Amazonbot",
  "DuckAssistBot",
  "cohere-ai",
  "CCBot",              // Common Crawl, the corpus behind many models
  "Bytespider",         // ByteDance
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
