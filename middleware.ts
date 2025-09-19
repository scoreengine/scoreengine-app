import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // Allow unauthenticated access to public pages and webhooks
  publicRoutes: ['/', '/login', '/api/lsz/webhook', '/api/health'],
});

export const config = {
  // Protect everything except static files and Next internals
  matcher: ['/((?!.*\\..*|_next).*)', '/'],
};