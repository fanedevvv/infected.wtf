"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";

type SearchUser = { id: number; username: string; avatar: string };

const PRO_FEATURES = [
  { title: "2× Profile View Tokens", desc: "Earn 5 tokens per profile view instead of 3." },
  { title: "2× Referral Tokens", desc: "Earn 20 tokens per referral instead of 10." },
  { title: "Premium Layouts", desc: "Deck, Orbit, Terminal, Scrapbook, Hex Grid, Vinyl and Constellation." },
  { title: "Particle Background", desc: "Animated particles across your profile background." },
  { title: "Cursor Trail", desc: "A glowing trail follows visitors' cursor on your page." },
  { title: "Infected Plus Name Glow", desc: "Your display name gets a glowing Plus highlight." },
  { title: "Gift Infected Plus to Friends", desc: "Send Infected Plus time to other users using tokens." },
];

export default function PremiumClient({
  tokens,
  isPremium,
  premiumExpiresAt,
}: {
  tokens: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
}) {
  const t = useT();
  const [tokenBal, setTokenBal] = useState(tokens);
  const [days, setDays] = useState(30);
  const [activating, setActivating] = useState(false);

  const [amount, setAmount] = useState(50);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [target, setTarget] = useState<SearchUser | null>(null);
  const [sending, setSending] = useState(false);

  const cost = days * 100;

  async function activatePremium() {
    if (tokenBal < cost) { showToast(`Not enough tokens. You need ${cost}.`, "error"); return; }
    setActivating(true);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_premium_tokens", days }),
      });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, "success");
        setTokenBal(j.tokens);
      } else {
        showToast(j.error || "Failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setActivating(false);
    }
  }

  async function searchUsers(q: string) {
    setSearch(q);
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search_users", q: q.trim() }) });
      const j = await res.json();
      setResults(j.success ? j.users : []);
    } catch {
      setResults([]);
    }
  }

  async function sendTransfer() {
    if (!target || amount < 10) return;
    setSending(true);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer_tokens", targetId: target.id, amount }),
      });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, "success");
        setTokenBal(j.tokens);
        setTarget(null);
        setSearch("");
        setResults([]);
      } else {
        showToast(j.error || "Failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>{t("Infected Plus")}</h2>
          <p>{isPremium ? `You have Infected Plus${premiumExpiresAt ? ` until ${new Date(premiumExpiresAt).toLocaleDateString()}` : ""}.` : "Unlock exclusive perks across the platform"}</p>
        </div>
        <div className="shop-token-bal"><span>{tokenBal.toLocaleString()} tokens</span></div>
      </div>

      <div className="premium-grid">
        <div className="dash-card">
          <div className="tpm-pill" style={{ marginBottom: ".5rem" }}>{t("TOKENS")}</div>
          <div className="tpm-title">{t("Buy Infected Plus with Tokens")}</div>
          <div className="tpm-sub" style={{ marginBottom: "1.25rem" }}>{t("100 tokens per day")}</div>

          <div className="tpm-days-label">{t("Number of days")}</div>
          <div className="tpm-days-row">
            <div className="tpm-days-ctrl">
              <button type="button" className="tpm-days-btn" onClick={() => setDays((d) => Math.max(1, d - 1))}>−</button>
              <input type="number" className="tpm-days-input" value={days} onChange={(e) => setDays(Math.max(1, parseInt(e.target.value, 10) || 1))} />
              <button type="button" className="tpm-days-btn" onClick={() => setDays((d) => d + 1)}>+</button>
            </div>
          </div>
          <div className="tpm-preset-chips">
            {[7, 30, 90, 365].map((d) => (
              <button type="button" key={d} className={`tpm-chip ${days === d ? "active" : ""}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
          <div className="tpm-cost-card">
            <div>
              <div className="tpm-cost-label">{t("Total cost")}</div>
              <div className="tpm-cost-amount">{cost.toLocaleString()}</div>
            </div>
            <div className="tpm-cost-unit">tokens</div>
          </div>
          <div className="tpm-bal-row">
            <span className="tpm-bal-label">{t("Your balance")}</span>
            <span className="tpm-bal-value">{tokenBal.toLocaleString()} tokens</span>
          </div>
          <div className="tpm-bar-track">
            <div className={`tpm-bar-fill ${cost > tokenBal ? "danger" : ""}`} style={{ width: `${Math.min(100, (cost / Math.max(1, tokenBal)) * 100)}%` }} />
          </div>
          <button type="button" className="tpm-activate-btn" disabled={cost > tokenBal || activating} onClick={activatePremium}>
            {activating ? "Activating…" : "Activate Infected Plus"}
          </button>
          {cost > tokenBal && <div className="tpm-not-enough" style={{ display: "block" }}>{t("Not enough tokens.")}</div>}
        </div>

        <div className="dash-card">
          <div className="tpm-pill" style={{ marginBottom: ".5rem" }}>{t("SEND")}</div>
          <div className="tpm-title">{t("Transfer Tokens")}</div>
          <div className="tpm-sub" style={{ marginBottom: "1.25rem" }}>{t("Send tokens to another user (min. 10)")}</div>

          <div className="tpm-days-row">
            <div className="tpm-days-ctrl">
              <button type="button" className="tpm-days-btn" onClick={() => setAmount((a) => Math.max(10, a - 10))}>−</button>
              <input type="number" className="tpm-days-input" value={amount} onChange={(e) => setAmount(Math.max(10, parseInt(e.target.value, 10) || 10))} />
              <button type="button" className="tpm-days-btn" onClick={() => setAmount((a) => a + 10)}>+</button>
            </div>
          </div>

          {target ? (
            <div className="gift-selected-user show" style={{ marginTop: "1rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={target.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
              <span>@{target.username}</span>
              <button type="button" className="gift-selected-clear" onClick={() => setTarget(null)} title={t("Clear")}>✕</button>
            </div>
          ) : (
            <>
              <div className="gift-search-wrap" style={{ marginTop: "1rem" }}>
                <svg className="gift-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" className="gift-search-input" placeholder={t("Search username...")} value={search} onChange={(e) => searchUsers(e.target.value)} autoComplete="off" />
              </div>
              {results.length > 0 && (
                <div className="gift-results show">
                  {results.map((u) => (
                    <div className="gift-result-item" key={u.id} onClick={() => { setTarget(u); setResults([]); }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="gift-result-avatar" src={u.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
                      <span className="gift-result-name">@{u.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <button type="button" className="tpm-activate-btn" style={{ marginTop: "1.25rem" }} disabled={!target || amount < 10 || amount > tokenBal || sending} onClick={sendTransfer}>
            {sending ? "Sending…" : `Send ${amount.toLocaleString()} Tokens`}
          </button>
          {target && amount > tokenBal && <div className="tpm-not-enough" style={{ display: "block" }}>{t("Not enough tokens.")}</div>}
        </div>
      </div>

      <div className="section-header" style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.15rem" }}>{t("PRO Features")}</h2>
        <p>{t("Everything unlocked with an active Infected Plus subscription")}</p>
      </div>
      <div className="pro-feature-grid">
        {PRO_FEATURES.map((f) => (
          <div key={f.title} className="pro-feature-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path d="M20 6L9 17l-5-5" /></svg>
            <div>
              <div className="pro-feature-title">{f.title}</div>
              <div className="pro-feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
