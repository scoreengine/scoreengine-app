"use client";

import { useEffect, useState } from 'react';
import { SignedIn } from '@clerk/nextjs';

interface MeResponse {
  id: string;
  email: string;
  credits: number;
  trialEndsAt?: string | null;
  hasActiveSub: boolean;
}

export default function Billing() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMe() {
      const res = await fetch('/api/me');
      if (res.ok) {
        setMe(await res.json());
      }
    }
    loadMe();
  }, []);

  const startCheckout = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignedIn>
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">Billing</h1>
        {me && (
          <div className="glass p-4">
            <p className="font-semibold">Credits: {me.credits}</p>
            {me.trialEndsAt && (
              <p className="text-sm text-neutral-light/70">
                Trial ends {new Date(me.trialEndsAt).toLocaleDateString()}
              </p>
            )}
            <p className="mt-2 text-sm">
              Subscription status: {me.hasActiveSub ? 'Active' : 'None'}
            </p>
          </div>
        )}
        <div className="glass p-4 space-y-4">
          <h2 className="text-xl font-semibold">Buy credits</h2>
          <button
            onClick={() => startCheckout('/api/credits/checkout')}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-ai-gradient-from to-ai-gradient-to rounded-md text-neutral-dark font-semibold hover:brightness-105 disabled:opacity-50"
          >
            Purchase Top‑Up
          </button>
          <button
            onClick={() => startCheckout('/api/subscription/checkout')}
            disabled={loading}
            className="w-full px-4 py-3 bg-secondary rounded-md text-neutral-light font-semibold hover:bg-secondary/80 disabled:opacity-50"
          >
            Start Subscription
          </button>
          {error && <p className="text-red-400">{error}</p>}
        </div>
      </main>
    </SignedIn>
  );
}
