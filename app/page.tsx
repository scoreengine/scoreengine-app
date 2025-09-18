import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen p-8">
      <SignedOut>
        <div className="max-w-md text-center glass p-8">
          <h1 className="text-3xl font-bold mb-4">Welcome to ScoreEngine</h1>
          <p className="mb-6 text-neutral-light/80">
            ScoreEngine helps agency sales teams craft personalised cold emails in seconds. Sign in to get started.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-md bg-gradient-to-r from-ai-gradient-from to-ai-gradient-to text-neutral-dark font-semibold shadow-md hover:brightness-105"
          >
            Sign In
          </Link>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="text-center">
          <p className="mb-4">You are signed in. Proceed to your dashboard.</p>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-md bg-gradient-to-r from-ai-gradient-from to-ai-gradient-to text-neutral-dark font-semibold shadow-md hover:brightness-105"
          >
            Go to Dashboard
          </Link>
        </div>
      </SignedIn>
    </main>
  );
}