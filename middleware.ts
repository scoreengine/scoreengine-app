import { withClerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// This middleware protects dashboard, billing and admin pages by
// requiring an authenticated session. It leverages Clerk’s built‑in
// middleware. You can also add custom logic here (e.g. check user
// roles) by inspecting req.auth.
export default withClerkMiddleware((req) => {
  // Additional route guards can be added here. For example, you could
  // restrict access to `/admin` to users whose email matches OWNER_EMAIL.
  return NextResponse.next();
});

// Only match paths that require authentication. API routes are
// authenticated individually in their handlers.
export const config = {
  matcher: ['/dashboard/:path*', '/billing/:path*', '/admin/:path*'],
};