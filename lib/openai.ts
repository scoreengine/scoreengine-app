import { z } from 'zod';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Define the expected JSON schema for the AI output using Zod. This mirrors the
// schema described in the prompt and is used to validate the response. The
// validation logic also enforces several constraints (e.g. email length,
// number of quick wins) after parsing.
const EmailResponseSchema = z.object({
  subject: z.string().min(1),
  icebreaker: z.string().min(1),
  stopper: z.string().min(1),
  quickWins: z.array(z.string().min(1)).min(2).max(3),
  serviceHook: z.string().min(1),
  cta: z.string().min(1),
  fullEmail: z.string().min(1),
  meta: z.object({
    company_name: z.string().min(1),
    service: z.string().min(1),
    url: z.string().url().or(z.string().min(1)),
    paths_mentioned: z.array(z.string()),
    icebreaker_source: z.enum([
      'homepage',
      '/blog',
      '/pricing',
      '/checkout',
      'press',
      'site_evergreen',
      'recent_update',
    ]),
    word_count: z.number().int().nonnegative(),
  }),
});

export type EmailResponse = z.infer<typeof EmailResponseSchema>;

const systemPrompt = `You are ScoreEngine, an assistant for agency salespeople.

TASK
Turn a prospect’s site URL and a user-selected SERVICE into a copy-ready intro email — in seconds.

OUTPUT = JSON ONLY (no prose outside JSON) with:
{
  "subject": "...",
  "icebreaker": "...",
  "stopper": "...",
  "quickWins": ["...", "..."],
  "serviceHook": "...",
  "cta": "...",
  "fullEmail": "...",
  "meta": {
    "company_name": "...",
    "service": "...",
    "url": "...",
    "paths_mentioned": ["..."],
    "icebreaker_source": "homepage|/blog|/pricing|/checkout|press|site_evergreen|recent_update",
    "word_count": 0
  }
}

SERVICES (user will choose one; never infer):
- Ads
- Apps, integrations & automation
- Branding
- Copywriting
- E-commerce optimization
- Email marketing
- Funnels
- Growth marketing
- Opt-in forms
- SEO
- Web design & UI

RULES
- Language: EN (US) unless locale = "fr".
- fullEmail = 85–130 words, 4–7 short lines. Bullets allowed (max 3).
- Icebreaker: cite ONE verifiable element from the site (/blog ≤120d, homepage hero, /pricing, /checkout, a visible PDP, /careers, press/news). If recent_update is provided, use it; else fallback to site/blog. Must feel like a natural first line, not flattery.
- Stopper: exactly ONE idea, written as a conversational sentence in first person (“I noticed…”, “It looks like…”). It must sound like an SDR, not an audit report.
- Quick wins: 2–3 realistic suggestions, each a short natural sentence starting with a verb (“Adding…”, “Including…”, “Simplifying…”).
- Service hook: one simple line stating what the agency can deliver in 7–14 days, adapted to the service.
- CTA: one clear ask (e.g., “Open to a quick chat?”). Exactly one CTA sentence.
- Closing: always end the email with a polite sign-off using input.user_first_name if provided (e.g., “Best, Ben”). If missing, default to “Best regards”.
- Deliverability: no links, no attachments, no emojis, no exclamation marks.
- Personalization: use the word “site” and reference sections/paths (e.g., “homepage hero”, “/checkout”), not full URLs.

SELF-CHECK before returning:
- JSON is valid and includes all keys above.
- fullEmail 85–130 words; one icebreaker; one stopper; 2–3 quick wins; one CTA; ends with sign-off.
- No personal data. Only public site sections mentioned.
Return JSON only.`;

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return openaiInstance;
}

/**
 * Generate an outreach email using OpenAI. If the OpenAI API is not
 * configured or the call fails, a dummy response is returned. The
 * function validates the JSON using Zod and retries once on invalid
 * output. If validation continues to fail, an error is thrown.
 */
export async function generateEmail({
  url,
  serviceAngle,
  recentUpdate,
  locale = 'en',
  tone,
}: {
  url: string;
  serviceAngle: string;
  recentUpdate?: string;
  locale?: string;
  tone?: string;
}): Promise<EmailResponse> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  // Fallback dummy response if no API key is configured
  if (!openaiApiKey) {
    const dummy: EmailResponse = {
      subject: `Quick idea for ${serviceAngle} on your site`,
      icebreaker: `I noticed your homepage is full of potential but could use a stronger call to action.`,
      stopper: `It looks like you haven’t updated your pricing page in a while`,
      quickWins: [
        'Adding a clear headline on the homepage hero can boost conversions.',
        'Including a signup form above the fold may capture more leads.',
        'Simplifying your navigation will make it easier to find the pricing page.',
      ],
      serviceHook: `We can overhaul your ${serviceAngle.toLowerCase()} in under two weeks.`,
      cta: 'Open to a quick chat?',
      fullEmail: `Hi there,\n\nI noticed your homepage is full of potential but could use a stronger call to action. It looks like you haven’t updated your pricing page in a while. Adding a clear headline on the homepage hero can boost conversions. Including a signup form above the fold may capture more leads. Simplifying your navigation will make it easier to find the pricing page. We can overhaul your ${serviceAngle.toLowerCase()} in under two weeks. Open to a quick chat?\n\nBest regards`,
      meta: {
        company_name: '',
        service: serviceAngle,
        url,
        paths_mentioned: ['/'],
        icebreaker_source: 'homepage',
        word_count: 105,
      },
    };
    return dummy;
  }

  // Build the user prompt. We include the URL, service and optional recentUpdate.
  const userPromptParts: string[] = [];
  userPromptParts.push(`URL: ${url}`);
  userPromptParts.push(`SERVICE: ${serviceAngle}`);
  if (recentUpdate) userPromptParts.push(`RECENT_UPDATE: ${recentUpdate}`);
  if (locale) userPromptParts.push(`LOCALE: ${locale}`);
  if (tone) userPromptParts.push(`TONE: ${tone}`);
  const userPrompt = userPromptParts.join('\n');

  // ✅ Type messages for the OpenAI SDK v4
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const openai = getOpenAI();
  let attempts = 0;

  while (attempts < 2) {
    attempts++;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages,
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' as const },
      });

      const text = completion.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(text);
      const validated = EmailResponseSchema.parse(parsed);

      // Additional checks outside of Zod
      const wc = validated.fullEmail.split(/\s+/).filter(Boolean).length;
      if (wc < 85 || wc > 130) throw new Error('fullEmail out of range');
      if (validated.quickWins.length < 2 || validated.quickWins.length > 3) {
        throw new Error('invalid number of quickWins');
      }

      return validated;
    } catch (err) {
      if (attempts >= 2) throw err;
      // retry once
    }
  }

  // Should be unreachable
  throw new Error('Failed to generate email');
}