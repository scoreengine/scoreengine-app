"use client";

/*
  Dashboard page
  (client component)
*/

import { useCallback, useEffect, useState } from 'react';
import { SignedIn } from '@clerk/nextjs';
import { clsx } from 'clsx';

interface MeResponse {
  id: string;
  email: string;
  credits: number;
  trialEndsAt?: string | null;
  hasActiveSub: boolean;
}

interface AuditItem {
  id: string;
  createdAt: string;
  resultJson: any;
  serviceAngle: string;
}

type GenerationResult = {
  subject: string;
  fullEmail: string;
};

// ✅ Helper pour normaliser les URLs
function normalizeUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

export default function Dashboard() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [history, setHistory] = useState<AuditItem[]>([]);
  const [form, setForm] = useState({
    url: '',
    serviceAngle: '',
    recentUpdate: '',
    locale: 'en',
    tone: '',
  });

  // Fetch current user info
  useEffect(() => {
    async function loadMe() {
      const res = await fetch('/api/me');
      if (res.ok) setMe(await res.json());
    }
    loadMe();
  }, []);

  // Load audit history
  useEffect(() => {
    async function loadHistory() {
      const res = await fetch('/api/audits');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    }
    loadHistory();
  }, []);

  const serviceOptions = [
    'Ads',
    'Apps, integrations & automation',
    'Branding',
    'Copywriting',
    'E-commerce optimization',
    'Email marketing',
    'Funnels',
    'Growth marketing',
    'Opt-in forms',
    'SEO',
    'Web design & UI',
  ];

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizeUrl(form.url), // ✅ Normalisation ici
          serviceAngle: form.serviceAngle,
          recentUpdate: form.recentUpdate || undefined,
          locale: form.locale,
          tone: form.tone || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Generation failed');
      }
      const data = (await res.json()) as GenerationResult;
      setResult(data);

      // Reload user and history after generating
      const [meRes, histRes] = await Promise.all([fetch('/api/me'), fetch('/api/audits')]);
      if (meRes.ok) setMe(await meRes.json());
      if (histRes.ok) {
        const hist = await histRes.json();
        setHistory(hist.items || []);
      }
    } catch (err: any) {
      setError(err.message ?? 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const copyToClipboard = useCallback(() => {
    if (result?.fullEmail) {
      navigator.clipboard.writeText(result.fullEmail);
      alert('Email copied to clipboard');
    }
  }, [result]);

  const isGenerateDisabled =
    loading || !form.url || !form.serviceAngle || (!!me && me.credits <= 0);

  return (
    <SignedIn>
      <main className="max-w-4xl mx-auto p-4 flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* Credit status */}
        {me && (
          <div className="glass p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">Credits: {me.credits}</p>
              {me.trialEndsAt && (
                <p className="text-sm text-neutral-light/70">
                  Trial ends {new Date(me.trialEndsAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div>
              <a
                href="/billing"
                className="px-4 py-2 rounded-md bg-primary text-neutral-light hover:bg-primary/80"
              >
                Manage Billing
              </a>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="glass p-6">
          <h2 className="text-xl font-semibold mb-4">New Audit</h2>
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-1">Website URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="example.com or https://example.com"
                className="p-2 rounded-md bg-neutral-dark/60 border border-neutral-dark/30 focus:outline-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1">Service Angle</label>
              <select
                value={form.serviceAngle}
                onChange={(e) => setForm({ ...form, serviceAngle: e.target.value })}
                className="p-2 rounded-md bg-neutral-dark/60 border border-neutral-dark/30 focus:outline-none"
              >
                <option value="">Select a service</option>
                {serviceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1">Recent update (optional)</label>
              <input
                type="text"
                value={form.recentUpdate}
                onChange={(e) => setForm({ ...form, recentUpdate: e.target.value })}
                placeholder="e.g. Launched new feature last week"
                className="p-2 rounded-md bg-neutral-dark/60 border border-neutral-dark/30 focus:outline-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1">Locale</label>
              <select
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
                className="p-2 rounded-md bg-neutral-dark/60 border border-neutral-dark/30 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <button
              disabled={isGenerateDisabled}
              onClick={handleGenerate}
              className={clsx(
                'mt-2 w-full py-3 rounded-md text-neutral-dark font-semibold',
                'bg-gradient-to-r from-ai-gradient-from to-ai-gradient-to',
                isGenerateDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>

            {error && <p className="text-red-400 mt-2">{error}</p>}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="glass p-6 space-y-4">
            <h2 className="text-xl font-semibold">Result</h2>
            <div>
              <p className="font-semibold">Subject</p>
              <p>{result.subject}</p>
            </div>
            <div>
              <p className="font-semibold">Email</p>
              <pre className="whitespace-pre-wrap bg-neutral-dark/40 p-4 rounded-md">
                {result.fullEmail}
              </pre>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-secondary text-neutral-light rounded-md hover:bg-secondary/80"
            >
              Copy Email
            </button>
          </div>
        )}

        {/* History */}
        <div className="glass p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Audits</h2>
          {history.length === 0 && <p>No audits yet.</p>}
          <ul className="space-y-4">
            {history.map((item) => (
              <li key={item.id} className="border-b border-neutral-dark/30 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{item.resultJson?.subject || 'Untitled'}</p>
                    <p className="text-sm text-neutral-light/70">
                      {new Date(item.createdAt).toLocaleString()} • {item.serviceAngle}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.resultJson?.fullEmail || '');
                    }}
                    className="text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </SignedIn>
  );
}