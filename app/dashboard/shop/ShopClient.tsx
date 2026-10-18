"use client";

import { useState } from "react";
import { BADGE_SVG } from "@/lib/badge-defs";
import { showToast } from "@/lib/toast";
import EffectPreviewCanvas from "@/components/EffectPreviewCanvas";

const SITE_NAME = "INFECTED.WTF";
const ADMIN_EMAIL = `admin@${SITE_NAME.toLowerCase().replace(/[^a-z0-9.]/gi, "")}`;

type BadgeItem = { name: string; price: number; desc: string; color: string };
type EffectItem = { name: string; price: number; type: "cursor" | "avatar" | "bg"; desc: string; color: string };
type Bundle = { id: number; name: string; price: number; priceType: string; badges: string[]; effects: string[]; premiumDays: number; owned: boolean };

type Props = {
  username: string;
  userId: number;
  tokens: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  ownedBadges: string[];
  purchasedEffects: string[];
  x2Active: boolean;
  bundles: Bundle[];
  badgeCatalog: Record<string, BadgeItem>;
  effectCatalog: Record<string, EffectItem>;
};

const TOKEN_PACKS = [
  { id: "pack_150", tokens: 150, bonus: 0, price: "€0.99", popular: false },
  { id: "pack_450", tokens: 450, bonus: 0, price: "€2.99", popular: false },
  { id: "pack_700", tokens: 700, bonus: 70, price: "€4.99", popular: true },
  { id: "pack_1500", tokens: 1500, bonus: 150, price: "€8.99", popular: false },
  { id: "pack_2000", tokens: 2000, bonus: 250, price: "€9.99", popular: false },
];

const EFFECT_TYPE_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  cursor: {
    label: "Cursor Trail Effects",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z" /></svg>,
  },
  avatar: {
    label: "Avatar Effects",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" /></svg>,
  },
  bg: {
    label: "Background Effects",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  },
};

function GiftIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size}>
      <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}
function BuyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>;
}
function TokenIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
    </svg>
  );
}

type GiftTarget =
  | { kind: "badge"; id: string; name: string; price: number; color: string }
  | { kind: "effect"; id: string; name: string; price: number; color: string }
  | { kind: "bundle"; id: number; name: string; price: number; color: string }
  | { kind: "premium_money" }
  | { kind: "premium_tokens" };

export default function ShopClient(props: Props) {
  const [tokens, setTokens] = useState(props.tokens);
  const [ownedBadges, setOwnedBadges] = useState(new Set(props.ownedBadges));
  const [purchasedEffects, setPurchasedEffects] = useState(new Set(props.purchasedEffects));
  const [ownedBundles, setOwnedBundles] = useState(new Set(props.bundles.filter((b) => b.owned).map((b) => b.id)));
  const [isPremium, setIsPremium] = useState(props.isPremium);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(props.premiumExpiresAt);

  const [confirmBuy, setConfirmBuy] = useState<{ kind: "badge" | "effect" | "bundle"; id: string | number; name: string; price: number; color: string } | null>(null);
  const [gift, setGift] = useState<GiftTarget | null>(null);
  const [giftSearch, setGiftSearch] = useState("");
  const [giftResults, setGiftResults] = useState<{ id: number; username: string; avatar: string }[]>([]);
  const [giftTarget, setGiftTarget] = useState<{ id: number; username: string; avatar: string } | null>(null);
  const [giftDays, setGiftDays] = useState(30);
  const [giftSending, setGiftSending] = useState(false);

  const [verifiedModalOpen, setVerifiedModalOpen] = useState(false);
  const [tokenPremOpen, setTokenPremOpen] = useState(false);
  const [tokenPremDays, setTokenPremDays] = useState(30);

  const hasVerified = ownedBadges.has("verified");

  async function doBuy() {
    if (!confirmBuy) return;
    const { kind, id } = confirmBuy;
    setConfirmBuy(null);
    const payload =
      kind === "badge" ? { action: "buy_badge", badgeId: id } : kind === "effect" ? { action: "buy_effect", effectId: id } : { action: "buy_bundle", bundleId: id };
    try {
      const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, "success");
        if (typeof j.tokens === "number") setTokens(j.tokens);
        if (kind === "badge") setOwnedBadges((s) => new Set([...s, id as string]));
        if (kind === "effect") setPurchasedEffects((s) => new Set([...s, id as string]));
        if (kind === "bundle") setOwnedBundles((s) => new Set([...s, id as number]));
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function searchGiftUsers(q: string) {
    setGiftSearch(q);
    if (q.trim().length < 2) {
      setGiftResults([]);
      return;
    }
    try {
      const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search_users", q: q.trim() }) });
      const j = await res.json();
      setGiftResults(j.success ? j.users : []);
    } catch {
      setGiftResults([]);
    }
  }

  function closeGift() {
    setGift(null);
    setGiftTarget(null);
    setGiftSearch("");
    setGiftResults([]);
    setGiftDays(30);
  }

  async function sendGift() {
    if (!gift || !giftTarget) return;
    if (gift.kind === "premium_money") {
      window.location.href = `mailto:${ADMIN_EMAIL}?subject=Gift+Infected+Plus&body=I+want+to+gift+Infected+Plus+to+user+ID:+${giftTarget.id}+(@${giftTarget.username}).+My+user+ID:+${props.userId}`;
      showToast("Opening email to complete the Infected Plus gift...", "success");
      closeGift();
      return;
    }
    setGiftSending(true);
    let payload: Record<string, unknown>;
    if (gift.kind === "badge") payload = { action: "gift_badge", badgeId: gift.id, targetId: giftTarget.id };
    else if (gift.kind === "effect") payload = { action: "gift_effect", effectId: gift.id, targetId: giftTarget.id };
    else if (gift.kind === "bundle") payload = { action: "gift_bundle", bundleId: gift.id, targetId: giftTarget.id };
    else payload = { action: "gift_premium_tokens", targetId: giftTarget.id, days: giftDays };

    try {
      const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, "success");
        if (typeof j.tokens === "number") setTokens(j.tokens);
        closeGift();
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setGiftSending(false);
    }
  }

  async function activatePremiumTokens() {
    const cost = tokenPremDays * 100;
    if (tokens < cost) {
      showToast(`Not enough tokens. You need ${cost} tokens.`, "error");
      return;
    }
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_premium_tokens", days: tokenPremDays }),
      });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, "success");
        setTokens(j.tokens);
        setIsPremium(true);
        setTokenPremOpen(false);
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  return (
    <>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Shop</h2>
          <p>Unlock exclusive perks with your tokens and cash.</p>
        </div>
        <div className="shop-token-bal">
          <TokenIcon size={16} />
          <span id="shop-token-count">{tokens.toLocaleString()}</span> tokens
        </div>
      </div>

      {/* Bundles */}
      {props.bundles.length > 0 && (
        <div className="bundles-grid">
          {props.bundles.map((b) => (
            <div className="bundle-shop-card" key={b.id}>
              <span className="bundle-pill-label">BUNDLE</span>
              <div className="bundle-name">{b.name}</div>
              <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)" }}>
                {b.badges.length > 0 && <>{b.badges.length} badge{b.badges.length !== 1 ? "s" : ""}</>}
                {b.effects.length > 0 && <>{b.badges.length > 0 ? " · " : ""}{b.effects.length} effect{b.effects.length !== 1 ? "s" : ""}</>}
                {b.premiumDays > 0 && <>{(b.badges.length > 0 || b.effects.length > 0) ? " · " : ""}{b.premiumDays}d Infected Plus</>}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.4rem", fontWeight: 900, color: "#10b981" }}>
                {b.priceType === "tokens" ? <>{b.price.toLocaleString()} tokens</> : <>€{b.price}</>}
              </div>
              {ownedBundles.has(b.id) ? (
                <div className="shop-card-owned-badge"><CheckIcon /> OWNED</div>
              ) : b.priceType === "tokens" ? (
                <button className="shop-buy-btn" onClick={() => setConfirmBuy({ kind: "bundle", id: b.id, name: b.name, price: b.price, color: "#10b981" })}>
                  <BuyIcon /> Buy
                </button>
              ) : (
                <a className="shop-buy-btn" href={`mailto:${ADMIN_EMAIL}?subject=Bundle+Purchase&body=User+ID:+${props.userId}%0ABundle:+${encodeURIComponent(b.name)}`}>
                  <BuyIcon /> Buy — €{b.price}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Infected Plus */}
      <div id="premium" className="prem-section">
        <div className="shop-top-grid">
          <div>
            <div className="prem-card">
              <div className="prem-card-header">
                <div>
                  <div className="prem-badge-pill">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg>
                    INFECTED PLUS
                  </div>
                  <div className="prem-title">Unlock the full experience</div>
                  <div className="prem-sub">Everything you need to stand out on {SITE_NAME}.</div>
                </div>
              </div>

              <div className="prem-perks">
                {[
                  "Full Analytics dashboard",
                  "Visual Effects access",
                  "Exclusive Diamond badge",
                  "Golden 3D avatar ring",
                  "Double referral rewards (20 tokens)",
                  "5 tokens per profile view (vs 3)",
                  "Priority support when you need it",
                  "Remove watermark from profile",
                ].map((perk) => (
                  <div className="prem-perk" key={perk}>
                    <span className="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg></span> {perk}
                  </div>
                ))}
              </div>

              {isPremium ? (
                <>
                  <div className="prem-active-banner">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg>
                    Infected Plus is active{premiumExpiresAt ? ` — expires ${new Date(premiumExpiresAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}` : " (lifetime)"}.
                    <button className="prem-token-buy" onClick={() => setTokenPremOpen(true)} style={{ marginLeft: "auto" }}>
                      <TokenIcon /> Extend with tokens
                    </button>
                  </div>
                  <div className="prem-gift-row">
                    <span className="prem-gift-label"><GiftIcon size={13} /> Gift Infected Plus:</span>
                    <button className="btn-gift-prem-money" onClick={() => setGift({ kind: "premium_money" })}>
                      <TokenIcon size={14} /> Gift for €7
                    </button>
                    <button className="btn-gift-prem-tokens" onClick={() => setGift({ kind: "premium_tokens" })}>
                      <TokenIcon size={14} /> Gift with tokens (100/day)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="prem-buy-row">
                    <div>
                      <div className="prem-price-tag">€7</div>
                      <div className="prem-price-sub">lifetime · one-time</div>
                    </div>
                    <a href={`mailto:${ADMIN_EMAIL}?subject=Infected+Plus+Purchase&body=User+ID:+${props.userId}`} className="btn-buy-premium">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg>
                      Buy Infected Plus — €7 <span style={{ fontSize: ".75rem", opacity: 0.75, fontWeight: 600, marginLeft: 4 }}>(lifetime)</span>
                    </a>
                    <button className="prem-token-buy" onClick={() => setTokenPremOpen(true)}>
                      <TokenIcon size={15} /> Buy with tokens <span style={{ fontSize: ".75rem", opacity: 0.75, fontWeight: 600, marginLeft: 2 }}>(100/day)</span>
                    </button>
                  </div>
                  <div className="prem-gift-row">
                    <span className="prem-gift-label"><GiftIcon size={13} /> Gift Infected Plus:</span>
                    <button className="btn-gift-prem-money" onClick={() => setGift({ kind: "premium_money" })}>
                      <TokenIcon size={14} /> Gift for €7
                    </button>
                    <button className="btn-gift-prem-tokens" style={{ opacity: 0.38, cursor: "not-allowed" }} title="Infected Plus required to gift with tokens" onClick={() => showToast("Gifting Infected Plus with tokens requires your own Infected Plus subscription.", "error")}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                      Gift with tokens (Infected Plus only)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Verified */}
          <div id="verified-section">
            <div className="verified-card">
              <div className="verified-card-left">
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className="verified-card-info">
                    <div className="verified-label"><CheckIcon /> VERIFIED</div>
                    <h3>Get Verified</h3>
                    <p>Show the world your account is authentic.</p>
                  </div>
                </div>
                <div className="verified-perks">
                  {["Official green checkmark badge", "Visible on your public profile", "Permanent — one-time purchase", "Builds trust with your audience"].map((perk) => (
                    <div className="verified-perk" key={perk}>
                      <span className="verified-perk-ico"><CheckIcon /></span> {perk}
                    </div>
                  ))}
                </div>
              </div>
              {hasVerified ? (
                <div className="verified-owned-banner">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                  Your account is Verified.
                </div>
              ) : (
                <div className="verified-buy-row">
                  <div>
                    <div className="verified-price">€5</div>
                    <div className="verified-price-sub">one-time · permanent</div>
                  </div>
                  <button className="btn-buy-verified" onClick={() => setVerifiedModalOpen(true)}>
                    <CheckIcon /> Buy Verified — €5
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* X2 banner */}
      {props.x2Active && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "linear-gradient(135deg,rgba(255,80,0,.13),rgba(255,160,0,.08))", border: "1.5px solid rgba(255,120,0,.45)", borderRadius: 16, padding: "1rem 1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: "rgba(255,140,0,.15)", border: "1px solid rgba(255,140,0,.3)", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: "#ff9900" }}><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 900, color: "#ff9900" }}>X2 TOKENS EVENT — ACTIVE!</div>
            <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.55)" }}>All token packs give <strong style={{ color: "#ffb900" }}>double tokens</strong> right now!</div>
          </div>
          <div style={{ background: "rgba(255,140,0,.18)", border: "1px solid rgba(255,140,0,.4)", borderRadius: 10, padding: ".4rem .9rem", fontWeight: 900, fontSize: ".9rem", color: "#ffaa00" }}>x2</div>
        </div>
      )}

      {/* Token packs */}
      <div className="shop-section" style={{ marginBottom: "2.5rem" }}>
        <div className="shop-section-head">
          <span className="shop-section-label" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
            BUY TOKENS
          </span>
          <h3 className="shop-section-title">Token Packs — real money</h3>
          <p style={{ fontSize: ".82rem", color: "rgba(255,255,255,.4)", margin: ".35rem 0 0" }}>Purchase tokens with real money.</p>
        </div>
        <div className="tpack-grid">
          {TOKEN_PACKS.map((pack) => {
            const baseTotal = pack.tokens + pack.bonus;
            const displayTotal = props.x2Active ? baseTotal * 2 : baseTotal;
            return (
              <div className={`tpack-card ${pack.popular ? "tpack-popular" : ""}`} key={pack.id}>
                {pack.popular && <div className="tpack-popular-badge">★ POPULAR</div>}
                <div className="tpack-tokens">
                  {(props.x2Active ? baseTotal * 2 : pack.tokens).toLocaleString()} <span>tokens</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                  {pack.bonus > 0 && !props.x2Active && (
                    <div className="tpack-bonus">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" /></svg>
                      +{pack.bonus} bonus tokens
                    </div>
                  )}
                  {props.x2Active && (
                    <div className="tpack-x2">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
                      x2 EVENT — {(baseTotal * 2).toLocaleString()} total
                    </div>
                  )}
                </div>
                <div className="tpack-price">{pack.price}</div>
                <a
                  href={`mailto:${ADMIN_EMAIL}?subject=Token+Pack+Purchase&body=User+ID:+${props.userId}%0AUsername:+${encodeURIComponent(props.username)}%0APack:+${pack.id}+(${encodeURIComponent(pack.price)})%0ATokens+expected:+${displayTotal}`}
                  className="tpack-buy-btn"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                  Buy {pack.price}
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges shop */}
      <div className="shop-section">
        <div className="shop-section-head">
          <span className="shop-section-label">TOKEN SHOP</span>
          <h3 className="shop-section-title">Make your profile unique with badges</h3>
        </div>
        <div className="shop-grid">
          {Object.entries(props.badgeCatalog).map(([id, item]) => {
            const owned = ownedBadges.has(id);
            return (
              <div className={`shop-card ${owned ? "shop-card-owned" : ""}`} style={{ ["--sc" as string]: item.color }} key={id}>
                <div className="shop-card-glow" />
                <div className="shop-card-top">
                  <div className="shop-card-icon">{BADGE_SVG[id]}</div>
                  <div className="shop-card-info">
                    <div className="shop-card-title-row">
                      <span className="shop-card-name">{item.name}</span>
                      <span className="shop-card-price"><TokenIcon /> {item.price.toLocaleString()}</span>
                    </div>
                    <p className="shop-card-desc">{item.desc}</p>
                  </div>
                </div>
                <div className="shop-card-actions" style={{ display: "flex", gap: ".5rem" }}>
                  {owned ? (
                    <div className="shop-card-owned-badge" style={{ flex: 1 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                      OWNED
                    </div>
                  ) : (
                    <button className="shop-buy-btn" onClick={() => setConfirmBuy({ kind: "badge", id, name: item.name, price: item.price, color: item.color })}>
                      <BuyIcon /> Buy
                    </button>
                  )}
                  <button className="shop-gift-btn" onClick={() => setGift({ kind: "badge", id, name: item.name, price: item.price, color: item.color })} title="Gift this badge">
                    <GiftIcon /> Gift
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Effects shop */}
      <div id="effects" className="shop-section" style={{ marginTop: "2.5rem" }}>
        <div className="shop-section-head">
          <span className="shop-section-label">EFFECTS SHOP</span>
          <h3 className="shop-section-title">Power up your profile with visual effects</h3>
        </div>

        {(["cursor", "avatar", "bg"] as const).map((typeKey) => (
          <div style={{ marginBottom: "2rem" }} key={typeKey}>
            <div style={{ display: "flex", alignItems: "center", gap: ".55rem", fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".13em", color: "rgba(255,255,255,.32)", marginBottom: "1rem" }}>
              {EFFECT_TYPE_LABEL[typeKey].icon}
              {EFFECT_TYPE_LABEL[typeKey].label}
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.07)" }} />
            </div>
            <div className="shop-grid">
              {Object.entries(props.effectCatalog)
                .filter(([, e]) => e.type === typeKey)
                .map(([id, eff]) => {
                  const owned = purchasedEffects.has(id);
                  return (
                    <div className={`shop-card ${owned ? "shop-card-owned" : ""}`} style={{ ["--sc" as string]: eff.color }} key={id}>
                      <div className="shop-card-glow" />
                      <div className="shop-card-top">
                        <div className="shop-card-icon" style={{ background: "#0a0a14", padding: 0, overflow: "hidden" }}>
                          <EffectPreviewCanvas effectId={id} />
                        </div>
                        <div className="shop-card-info">
                          <div className="shop-card-title-row">
                            <span className="shop-card-name">{eff.name}</span>
                            <span className="shop-card-price"><TokenIcon /> {eff.price.toLocaleString()}</span>
                          </div>
                          <p className="shop-card-desc">{eff.desc}</p>
                        </div>
                      </div>
                      <div className="shop-card-actions" style={{ display: "flex", gap: ".5rem" }}>
                        {owned ? (
                          <div className="shop-card-owned-badge" style={{ flex: 1 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                            OWNED
                          </div>
                        ) : (
                          <button className="shop-buy-btn" onClick={() => setConfirmBuy({ kind: "effect", id, name: eff.name, price: eff.price, color: eff.color })}>
                            <BuyIcon /> Buy
                          </button>
                        )}
                        <button className="shop-gift-btn" onClick={() => setGift({ kind: "effect", id, name: eff.name, price: eff.price, color: eff.color })} title="Gift this effect">
                          <GiftIcon /> Gift
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Buy confirm modal */}
      {confirmBuy && (
        <div className="scm-overlay scm-visible" style={{ display: "flex" }} onClick={(e) => e.target === e.currentTarget && setConfirmBuy(null)}>
          <div className="scm-box" style={{ ["--scm-glow" as string]: `${confirmBuy.color}33` }}>
            <div className="scm-icon">
              <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={confirmBuy.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="3" y1="6" x2="21" y2="6" stroke={confirmBuy.color} strokeWidth="1.7" strokeLinecap="round" />
                <path d="M16 10a4 4 0 01-8 0" stroke={confirmBuy.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="scm-title">Confirm Purchase</div>
            <div className="scm-sub">
              Buy <strong className="scm-badge-name" style={{ color: confirmBuy.color }}>{confirmBuy.name}</strong> for <span className="scm-price">{confirmBuy.price.toLocaleString()} tokens</span>?
            </div>
            <div className="scm-divider" />
            <div className="scm-actions">
              <button className="scm-btn-confirm" onClick={doBuy}>Confirm</button>
              <button className="scm-btn-cancel" onClick={() => setConfirmBuy(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Gift modal (badge / effect / bundle / premium-tokens) */}
      {gift && gift.kind !== "premium_money" && (
        <div className="gift-overlay open" onClick={(e) => e.target === e.currentTarget && closeGift()}>
          <div className="gift-modal">
            <button className="gift-close-x" onClick={closeGift}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="gift-modal-title"><GiftIcon size={16} /> Gift {gift.kind === "premium_tokens" ? "Infected Plus" : gift.kind === "bundle" ? "Bundle" : gift.kind === "effect" ? "Effect" : "Badge"}</div>
            <div className="gift-modal-sub">Choose who to send this gift to</div>

            {gift.kind === "premium_tokens" ? (
              <div>
                <div className="token-days-wrap">
                  <input type="number" min={1} max={365} value={giftDays} onChange={(e) => setGiftDays(Math.max(1, parseInt(e.target.value, 10) || 1))} className="token-days-input" />
                  <span style={{ color: "rgba(255,255,255,.5)" }}>days</span>
                  <span className="token-days-cost">= {(giftDays * 100).toLocaleString()} tokens</span>
                </div>
                <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.4)", marginBottom: "1rem" }}>Your balance: <span style={{ color: "#34d399" }}>{tokens.toLocaleString()}</span> tokens</div>
              </div>
            ) : (
              <div className="gift-badge-preview">
                <div className="gift-badge-ico" style={{ background: `${gift.color}22`, border: `1px solid ${gift.color}44` }}>
                  {gift.kind === "badge" ? BADGE_SVG[gift.id] : <div style={{ width: 14, height: 14, borderRadius: "50%", background: gift.color }} />}
                </div>
                <div className="gift-badge-meta">
                  <strong>{gift.name}</strong>
                  <span>{gift.price.toLocaleString()} tokens</span>
                </div>
              </div>
            )}

            {giftTarget ? (
              <div className="gift-selected-user show">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={giftTarget.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
                <span>@{giftTarget.username}</span>
                <button className="gift-selected-clear" onClick={() => setGiftTarget(null)} title="Clear">✕</button>
              </div>
            ) : (
              <>
                <div className="gift-search-wrap">
                  <svg className="gift-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input type="text" className="gift-search-input" placeholder="Search username..." value={giftSearch} onChange={(e) => searchGiftUsers(e.target.value)} autoComplete="off" />
                </div>
                {giftResults.length > 0 && (
                  <div className="gift-results show">
                    {giftResults.map((u) => (
                      <div className="gift-result-item" key={u.id} onClick={() => { setGiftTarget(u); setGiftResults([]); }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="gift-result-avatar" src={u.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
                        <span className="gift-result-name">@{u.username}</span>
                        <svg className="gift-result-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="gift-modal-actions">
              <button className="gift-cancel-btn" onClick={closeGift}>Cancel</button>
              <button className="gift-send-btn" disabled={!giftTarget || giftSending} onClick={sendGift}>{giftSending ? "Sending..." : "Send Gift"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Gift premium via money — reuses same search UI but sends via mailto */}
      {gift?.kind === "premium_money" && (
        <div className="gift-overlay open" onClick={(e) => e.target === e.currentTarget && closeGift()}>
          <div className="gift-modal" style={{ maxWidth: 400 }}>
            <button className="gift-close-x" onClick={closeGift}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="gift-modal-title" style={{ color: "#34d399" }}><GiftIcon size={16} /> Gift Infected Plus</div>
            <div className="gift-modal-sub">Send Infected Plus for €7 — we&apos;ll contact the recipient.</div>

            {giftTarget ? (
              <div className="gift-selected-user show">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={giftTarget.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
                <span>@{giftTarget.username}</span>
                <button className="gift-selected-clear" onClick={() => setGiftTarget(null)} title="Clear">✕</button>
              </div>
            ) : (
              <>
                <div className="gift-search-wrap">
                  <svg className="gift-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input type="text" className="gift-search-input" placeholder="Search username..." value={giftSearch} onChange={(e) => searchGiftUsers(e.target.value)} autoComplete="off" />
                </div>
                {giftResults.length > 0 && (
                  <div className="gift-results show">
                    {giftResults.map((u) => (
                      <div className="gift-result-item" key={u.id} onClick={() => { setGiftTarget(u); setGiftResults([]); }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="gift-result-avatar" src={u.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
                        <span className="gift-result-name">@{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="gift-modal-actions">
              <button className="gift-cancel-btn" onClick={closeGift}>Cancel</button>
              <button className="gift-send-btn" disabled={!giftTarget} onClick={sendGift}>Send Gift</button>
            </div>
          </div>
        </div>
      )}

      {/* Verified purchase modal */}
      {verifiedModalOpen && (
        <div className="vpm-overlay open" onClick={(e) => e.target === e.currentTarget && setVerifiedModalOpen(false)}>
          <div className="vpm-modal">
            <div className="vpm-header">
              <button className="vpm-close" onClick={() => setVerifiedModalOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <div className="vpm-title">Get Verified</div>
              <div className="vpm-sub">One-time purchase — permanent badge on your profile</div>
            </div>
            <div className="vpm-body">
              <div className="vpm-preview">
                <div className="vpm-preview-ico"><CheckIcon /></div>
                <div className="vpm-preview-info">
                  <strong>Verified Badge</strong>
                  <span>Official green checkmark — shows on your public profile</span>
                </div>
              </div>
              <a
                href={`mailto:${ADMIN_EMAIL}?subject=Verified+Badge+Purchase&body=User+ID:+${props.userId}%0AUsername:+${encodeURIComponent(props.username)}%0AI+want+to+purchase+the+Verified+badge+for+%E2%82%AC5.`}
                className="vpm-buy-btn"
                onClick={() => setVerifiedModalOpen(false)}
              >
                ✓ Buy Verified Badge — €5
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Token Infected Plus modal */}
      {tokenPremOpen && (
        <div className="tpm-overlay open" onClick={(e) => e.target === e.currentTarget && setTokenPremOpen(false)}>
          <div className="tpm-modal">
            <div className="tpm-header">
              <button className="tpm-close" onClick={() => setTokenPremOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <div className="tpm-pill">TOKENS</div>
              <div className="tpm-title">Activate Infected Plus</div>
              <div className="tpm-sub">100 tokens per day</div>
            </div>
            <div className="tpm-body">
              <div className="tpm-days-label">Number of days</div>
              <div className="tpm-days-row">
                <div className="tpm-days-ctrl">
                  <button className="tpm-days-btn" onClick={() => setTokenPremDays((d) => Math.max(1, d - 1))}>−</button>
                  <input type="number" className="tpm-days-input" value={tokenPremDays} onChange={(e) => setTokenPremDays(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                  <button className="tpm-days-btn" onClick={() => setTokenPremDays((d) => d + 1)}>+</button>
                </div>
              </div>
              <div className="tpm-preset-chips">
                {[7, 30, 90, 365].map((d) => (
                  <button key={d} className={`tpm-chip ${tokenPremDays === d ? "active" : ""}`} onClick={() => setTokenPremDays(d)}>{d}d</button>
                ))}
              </div>
              <div className="tpm-cost-card">
                <div>
                  <div className="tpm-cost-label">Total cost</div>
                  <div className="tpm-cost-amount">{(tokenPremDays * 100).toLocaleString()}</div>
                </div>
                <div className="tpm-cost-unit">tokens</div>
              </div>
              <div className="tpm-bal-row">
                <span className="tpm-bal-label">Your balance</span>
                <span className="tpm-bal-value">{tokens.toLocaleString()} tokens</span>
              </div>
              <div className="tpm-bar-track">
                <div className={`tpm-bar-fill ${tokenPremDays * 100 > tokens ? "danger" : ""}`} style={{ width: `${Math.min(100, (tokenPremDays * 100 / Math.max(1, tokens)) * 100)}%` }} />
              </div>
              <button className="tpm-activate-btn" disabled={tokenPremDays * 100 > tokens} onClick={activatePremiumTokens}>
                Activate Infected Plus
              </button>
              {tokenPremDays * 100 > tokens && <div className="tpm-not-enough" style={{ display: "block" }}>Not enough tokens.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
