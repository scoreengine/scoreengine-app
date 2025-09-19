import { z } from 'zod';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Define the expected JSON schema for the AI output using Zod
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
... (inchangé, je laisse ton contenu complet ici)
`;

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return openaiInstance;
}

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
  if (!openaiApiKey) {
    console.warn("⚠️ OPENAI_API_KEY is missing. Using dummy response.");
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

  const userPromptParts: string[] = [];
  userPromptParts.push(`URL: ${url}`);
  userPromptParts.push(`SERVICE: ${serviceAngle}`);
  if (recentUpdate) userPromptParts.push(`RECENT_UPDATE: ${recentUpdate}`);
  if (locale) userPromptParts.push(`LOCALE: ${locale}`);
  if (tone) userPromptParts.push(`TONE: ${tone}`);
  const userPrompt = userPromptParts.join('\n');

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const openai = getOpenAI();
  let attempts = 0;

  while (attempts < 2) {
    attempts++;
    try {
      console.log("DEBUG ➡️ Sending to OpenAI:", { messages });

      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages,
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' as const },
      });

      const text = completion.choices[0]?.message?.content ?? '';
      console.log("DEBUG ⬅️ OpenAI raw output:", text);

      const parsed = JSON.parse(text);
      const validated = EmailResponseSchema.parse(parsed);

      const wc = validated.fullEmail.split(/\s+/).filter(Boolean).length;
      if (wc < 85 || wc > 130) throw new Error('fullEmail out of range');
      if (validated.quickWins.length < 2 || validated.quickWins.length > 3) {
        throw new Error('invalid number of quickWins');
      }

      console.log("✅ DEBUG validated email response:", validated);
      return validated;
    } catch (err) {
      console.error("❌ DEBUG error in generateEmail attempt", attempts, err);
      if (attempts >= 2) throw err;
    }
  }

  throw new Error('Failed to generate email');
}