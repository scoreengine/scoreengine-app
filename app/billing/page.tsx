"use client";

import { useEffect, useState } from "react";
import { SignedIn } from "@clerk/nextjs";

interface MeResponse {
  credits: number;
  plan: string;
}

export default function BillingPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = (await res.json()) as MeResponse;
        if (mounted) setMe(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SignedIn>
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Billing & Credits</h1>
        {loading && <p className="mt-4 opacity-70">Loading…</p>}
        {!loading && me && (
          <div className="mt-6 space-y-3 rounded-xl border p-4 bg-white/60">
            <p><span className="font-medium">Plan:</span> {me.plan}</p>
            <p><span className="font-medium">Credits:</span> {me.credits}</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <a
            href="/api/subscription/checkout"
            className="rounded-lg px-4 py-2 text-white"
            style={{ background: "linear-gradient(90deg,#316bff,#ff9aff)" }}
          >
            Manage subscription
          </a>
          <a
            href="/api/credits/checkout"
            className="rounded-lg border px-4 py-2"
          >
            Buy top-up
          </a>
        </div>
      </main>
    </SignedIn>
  );
}
