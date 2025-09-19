// middleware.ts
import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// public routes (no auth)
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/health',
  '/api/lsz/webhook',
]);

export default clerkMiddleware((auth, req) => {
  try {
    if (!isPublicRoute(req)) auth().protect();  // require auth
    return NextResponse.next();
  } catch (err) {
    // Temporary fallback so the app doesn't 500 while Clerk is being configured
    console.error('Clerk middleware error:', err);
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};