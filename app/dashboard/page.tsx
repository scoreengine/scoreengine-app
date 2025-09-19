"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { clsx } from "clsx";

type Angle =
  | "Ads"
  | "Apps, integrations & automation"
  | "Branding"
  | "Copywriting"
  | "E-commerce optimization"
  | "Email marketing"
  | "Funnels"
  | "Growth marketing"
  | "Opt-in forms"
  | "SEO"
  | "Web design & UI";

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [angle, setAngle] = useState<Angle>("Web design & UI");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, angle }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [url, angle]);

  return (
    <SignedIn>
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">ScoreEngine</h1>
        <p className="mt-2 opacity-80">
          Paste a prospect URL, choose your service angle, and generate a
          proof-backed intro email.
        </p>

        <div className="mt-6 space-y-3 rounded-xl border p-4 bg-white/60">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://prospect.com"
            className="w-full rounded-lg border px-3 py-2"
          />
          <select
            value={angle}
            onChange={(e) => setAngle(e.target.value as Angle)}
            className="w-full rounded-lg border px-3 py-2"
          >
            {[
              "Ads",
              "Apps, integrations & automation",
              "Branding",
              "Copywriting",
              "E-commerce optimization",
              "Email marketing",
              "Funnels",
              "Growth marketing",
              "Opt-in forms",
              "SEO",
              "Web design & UI",
            ].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <button
            onClick={generate}
            disabled={loading || !url}
            className={clsx(
              "w-full rounded-lg px-4 py-2 text-white",
              loading ? "opacity-70" : "opacity-100"
            )}
            style={{ background: "linear-gradient(90deg,#316bff,#ff9aff)" }}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-3 rounded-xl border p-4 bg-white/60">
            <h2 className="text-lg font-semibold">Result</h2>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(result.email ?? "")}
              className="rounded-lg border px-3 py-2"
            >
              Copy email
            </button>
          </div>
        )}
      </main>
    </SignedIn>
  );
}
