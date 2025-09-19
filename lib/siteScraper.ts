// lib/siteScraper.ts
// Next.js (Node runtime) expose déjà `fetch`, donc pas besoin de `node-fetch`.
import { load } from 'cheerio';

export interface SiteSignals {
  title?: string;
  firstH1?: string;
  cta?: string;
  hasPricingPage?: boolean;
  hasSignupForm?: boolean;
  hasCalendar?: boolean;
  hasProofRow?: boolean;
}

/**
 * Fetch a webpage and extract simple signals that can help personalise
 * an outreach email. The function deliberately keeps the parsing
 * lightweight to avoid falling into the trap of scraping entire pages.
 */
export async function scrapeSite(url: string, timeoutMs = 7000): Promise<SiteSignals> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ScoreEngineBot/1.0' }
    });

    const html = await res.text();
    const $ = load(html); // ⬅️ cheerio ESM: utiliser `load` importé

    const title = $('title').first().text().trim();
    const firstH1 = $('h1').first().text().trim();

    // Determine CTA by looking for the first button or anchor with common CTA keywords
    let cta: string | undefined;
    const ctaKeywords = ['sign up', 'get started', 'try', 'demo', 'start your free', 'subscribe', 'join'];
    $('a, button').each((_, el) => {
      if (cta) return;
      const text = $(el).text().toLowerCase();
      if (ctaKeywords.some(k => text.includes(k))) {
        cta = $(el).text().trim();
      }
    });

    // Determine if there's a pricing page link
    let hasPricingPage = false;
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && /pricing|prices|plans/.test(href.toLowerCase())) {
        hasPricingPage = true;
        return false;
      }
    });

    // Signup form detection
    let hasSignupForm = false;
    $('input, form').each((_, el) => {
      const type = $(el).attr('type');
      const id = $(el).attr('id') || '';
      const name = $(el).attr('name') || '';
      const className = $(el).attr('class') || '';
      const attrs = `${id} ${name} ${className}`.toLowerCase();
      if (type === 'email' || attrs.includes('signup') || attrs.includes('register')) {
        hasSignupForm = true;
        return false;
      }
    });

    // Calendar detection (e.g. Calendly)
    const htmlLower = html.toLowerCase();
    const hasCalendar =
      htmlLower.includes('calendly') ||
      htmlLower.includes('schedule') ||
      htmlLower.includes('calendar');

    // Proof row detection (testimonials, social proof)
    const hasProofRow =
      htmlLower.includes('testimonial') ||
      htmlLower.includes('customer') ||
      htmlLower.includes('review');

    return {
      title: title || undefined,
      firstH1: firstH1 || undefined,
      cta,
      hasPricingPage,
      hasSignupForm,
      hasCalendar,
      hasProofRow,
    };
  } catch {
    // If the fetch failed or timed out, return an empty signal set
    return {};
  } finally {
    clearTimeout(timeout);
  }
}