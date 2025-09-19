import { clerkMiddleware } from '@clerk/nextjs/server';
export default clerkMiddleware({
  publicRoutes: ['/', '/api/health', '/api/lsz/webhook'],
});
export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/'] };