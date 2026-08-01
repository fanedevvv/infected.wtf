"use client";

import { useEffect, useState } from "react";

type ReferralData = {
  referralCode: string;
  count: number;
  tokensEarned: number;
  referrals: { username: string; createdAt: string; tokens: number }[];
};

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const link = data ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${data.referralCode}` : "";

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!data) return <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full text-white/50">Loading…</main>;

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Referral</h1>

      <div className="gf-card p-6 mb-6">
        <p className="text-white/50 text-sm mb-2">Your referral link</p>
        <div className="flex gap-2">
          <input readOnly className="gf-input" value={link} />
          <button onClick={copy} className="gf-btn shrink-0">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="text-white/40 text-xs mt-3">
          Earn 10 tokens for every friend who registers and verifies their email with your link. 10 referrals unlocks
          the Promoter badge, 20 unlocks Promoter Elite.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="gf-card p-4 text-center">
          <div className="text-2xl font-bold">{data.count}</div>
          <div className="text-white/40 text-xs">Referrals</div>
        </div>
        <div className="gf-card p-4 text-center">
          <div className="text-2xl font-bold">{data.tokensEarned}</div>
          <div className="text-white/40 text-xs">Tokens earned</div>
        </div>
      </div>

      {data.referrals.length > 0 && (
        <div className="space-y-2">
          {data.referrals.map((r, i) => (
            <div key={i} className="gf-card p-3 flex justify-between text-sm">
              <span>@{r.username}</span>
              <span className="text-white/40">+{r.tokens} tokens</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
