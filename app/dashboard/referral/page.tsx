import { redirect } from "next/navigation";
import crypto from "crypto";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import CopyRefLinkButton from "./CopyRefLinkButton";
import SafeImg from "@/components/SafeImg";

const PER_PAGE = 10;

export default async function ReferralPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let myCode = user.referralCode;
  if (!myCode) {
    myCode = crypto.createHash("md5").update(user.username + user.id + Date.now()).digest("hex").slice(0, 8).toUpperCase();
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: myCode } });
  }

  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const refLink = `${proto}://${host}/register?ref=${myCode}`;

  const totalRefs = await prisma.referral.count({ where: { referrerId: user.id } });
  const tokensAgg = await prisma.referral.aggregate({ where: { referrerId: user.id }, _sum: { tokensGiven: true } });
  const tokensEarned = tokensAgg._sum.tokensGiven ?? 0;

  const params = await searchParams;
  const totalPages = Math.max(1, Math.ceil(totalRefs / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(params.page || "1", 10) || 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  const referralsRaw = await prisma.referral.findMany({
    where: { referrerId: user.id, referred: { emailVerified: true } },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: PER_PAGE,
    include: { referred: { select: { username: true, profile: { select: { avatar: true } } } } },
  });

  const isPremium = user.isPremium;
  let tokensPerRef = isPremium ? 20 : 10;

  const settings = await prisma.siteSettings.findFirst();
  const x2Active = !!settings?.x2TokensEnabled;
  if (x2Active) tokensPerRef *= 2;

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  let earnedBadges = (profile?.badges as string[] | null) ?? [];
  let hasPromoter = earnedBadges.includes("promoter");
  let hasPromoterElite = earnedBadges.includes("promoter_elite");

  if (totalRefs >= 20 && !hasPromoterElite) {
    earnedBadges = earnedBadges.filter((b) => b !== "promoter");
    if (!earnedBadges.includes("promoter_elite")) earnedBadges.push("promoter_elite");
    await prisma.profile.update({ where: { userId: user.id }, data: { badges: earnedBadges } });
    hasPromoterElite = true;
    hasPromoter = false;
  } else if (totalRefs >= 10 && !hasPromoter && !hasPromoterElite) {
    earnedBadges.push("promoter");
    await prisma.profile.update({ where: { userId: user.id }, data: { badges: earnedBadges } });
    hasPromoter = true;
  }

  const phase1Goal = 10;
  const phase1Done = Math.min(totalRefs, phase1Goal);
  const phase2Done = Math.max(0, Math.min(totalRefs - phase1Goal, phase1Goal));
  const phase1Pct = (phase1Done / phase1Goal) * 100;
  const phase2Pct = hasPromoterElite ? 100 : (phase2Done / phase1Goal) * 100;

  const btnBase = "display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 .75rem;border-radius:10px;font-size:.82rem;font-weight:700;text-decoration:none;transition:all .2s;border:1px solid;";
  const btnNormal = btnBase + "background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.6);";
  const btnActive = btnBase + "background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.45);color:#00d4ff;box-shadow:0 0 12px rgba(0,212,255,.2);";
  const btnDisabl = btnBase + "background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.05);color:rgba(255,255,255,.2);pointer-events:none;";

  const pageNumbers: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pageNumbers.push(i);

  return (
    <>
      <div className="section-header">
        <h2>Referral Program</h2>
        <p>Invite friends and earn {tokensPerRef} tokens for each registration</p>
      </div>

      {(!hasPromoterElite || totalRefs < 20) && (
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "1.25rem 1.4rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(156,163,175,.1)", border: "1px solid rgba(156,163,175,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill={hasPromoterElite ? "#4b5563" : "#9ca3af"} width="18" height="18"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 800, color: "#fff", marginBottom: ".1rem" }}>
                Promoter Badge
                {hasPromoterElite ? (
                  <span style={{ marginLeft: ".5rem", fontSize: ".7rem", padding: ".2rem .55rem", borderRadius: 20, background: "rgba(75,85,99,.3)", border: "1px solid rgba(75,85,99,.6)", color: "#9ca3af", fontWeight: 700 }}>ELITE ✓</span>
                ) : hasPromoter ? (
                  <span style={{ marginLeft: ".5rem", fontSize: ".7rem", padding: ".2rem .55rem", borderRadius: 20, background: "rgba(156,163,175,.15)", border: "1px solid rgba(156,163,175,.4)", color: "#9ca3af", fontWeight: 700 }}>UNLOCKED ✓</span>
                ) : null}
              </div>
              <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.35)" }}>Invite friends via your referral link and unlock exclusive badges</div>
            </div>
            <div style={{ fontSize: ".78rem", fontWeight: 700, color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>{totalRefs} / 20 inv.</div>
          </div>

          <div style={{ marginBottom: ".9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".4rem" }}>
              <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: hasPromoter || hasPromoterElite ? "#9ca3af" : "rgba(255,255,255,.3)" }}>
                {hasPromoter || hasPromoterElite ? "✓ " : ""}Promoter <span style={{ opacity: 0.6 }}>(gray)</span>
              </span>
              <span style={{ fontSize: ".7rem", color: "rgba(255,255,255,.35)" }}>{phase1Done}/10</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${phase1Done >= 10 || hasPromoter || hasPromoterElite ? 100 : phase1Pct}%`, background: "#9ca3af", borderRadius: 99, transition: "width .6s" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".4rem" }}>
              <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: hasPromoterElite ? "#6b7280" : "rgba(255,255,255,.3)" }}>
                {hasPromoterElite ? "✓ " : ""}Promoter Elite <span style={{ opacity: 0.6 }}>(gray+black)</span>
              </span>
              <span style={{ fontSize: ".7rem", color: "rgba(255,255,255,.35)" }}>{hasPromoterElite ? "10" : phase2Done}/10 more</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${hasPromoterElite ? 100 : phase2Pct}%`, background: "linear-gradient(90deg,#6b7280,#1f2937)", borderRadius: 99, transition: "width .6s" }} />
            </div>
          </div>

          {!hasPromoter && !hasPromoterElite ? (
            <div style={{ marginTop: ".9rem", fontSize: ".72rem", color: "rgba(255,255,255,.3)", textAlign: "center" }}>
              You need <strong style={{ color: "rgba(156,163,175,.7)" }}>{Math.max(0, 10 - totalRefs)} more invite{Math.max(0, 10 - totalRefs) !== 1 ? "s" : ""}</strong> to unlock the Promoter badge (gray)
            </div>
          ) : hasPromoter && !hasPromoterElite ? (
            <div style={{ marginTop: ".9rem", fontSize: ".72rem", color: "rgba(255,255,255,.3)", textAlign: "center" }}>
              You need <strong style={{ color: "rgba(107,114,128,.8)" }}>{Math.max(0, 20 - totalRefs)} more invite{Math.max(0, 20 - totalRefs) !== 1 ? "s" : ""}</strong> to upgrade to Promoter Elite
            </div>
          ) : null}
        </div>
      )}

      {x2Active && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "linear-gradient(135deg,rgba(255,80,0,.13),rgba(255,160,0,.08))", border: "1.5px solid rgba(255,120,0,.45)", borderRadius: 16, padding: "1rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 0 32px rgba(255,100,0,.12)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,140,0,.18),transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: "rgba(255,140,0,.15)", border: "1px solid rgba(255,140,0,.3)", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: "#ff9900" }}><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "1rem", fontWeight: 900, color: "#ff9900", letterSpacing: ".03em" }}>X2 TOKENS EVENT — ACTIVE!</div>
            <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.55)", marginTop: ".2rem" }}>All referrals give <strong style={{ color: "#ffb900" }}>double tokens</strong> right now! You earn <strong style={{ color: "#ffb900" }}>+{tokensPerRef} tokens</strong> per invite.</div>
          </div>
          <div style={{ background: "rgba(255,140,0,.18)", border: "1px solid rgba(255,140,0,.4)", borderRadius: 10, padding: ".4rem .9rem", fontWeight: 900, fontSize: ".9rem", color: "#ffaa00", whiteSpace: "nowrap", letterSpacing: ".03em" }}>x2</div>
        </div>
      )}

      {isPremium ? (
        <div className="ref-premium-banner">
          <div className="ref-premium-banner-icon">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ color: "#ffd700" }}><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity=".8" /></svg>
          </div>
          <div className="ref-premium-banner-text">
            <div className="ref-premium-banner-title">Premium Referral Bonus Active</div>
            <div className="ref-premium-banner-sub">As a Premium member you earn <strong style={{ color: "#ffd700" }}>+20 tokens</strong> per referral instead of the standard 10. Double the rewards!</div>
          </div>
          <div className="ref-premium-badge">+20 tokens</div>
        </div>
      ) : (
        <div className="ref-upsell-banner">
          <div className="ref-upsell-icon">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ color: "#ffd700" }}><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity=".8" /></svg>
          </div>
          <div className="ref-upsell-text">
            <div className="ref-upsell-title">Get Premium for double referral rewards</div>
            <div className="ref-upsell-sub">Premium members earn <strong style={{ color: "rgba(255,215,0,.7)" }}>+20 tokens</strong> per referral instead of 10.</div>
          </div>
          <a href="/dashboard/shop" className="ref-upsell-link">Get Premium</a>
        </div>
      )}

      <div className="ref-hero">
        <div className="ref-stat">
          <div className="ref-stat-num">{totalRefs.toLocaleString()}</div>
          <div className="ref-stat-label">Total Referrals</div>
        </div>
        <div className="ref-stat">
          <div className="ref-stat-num" style={{ color: "#5fefa5" }}>+{tokensEarned.toLocaleString()}</div>
          <div className="ref-stat-label">Tokens Earned</div>
        </div>
        <div className="ref-stat">
          <div className="ref-stat-num accent">{myCode}</div>
          <div className="ref-stat-label">Your Code</div>
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,.35)", marginBottom: ".85rem" }}>
          Your Referral Link
        </div>
        <div className="ref-link-box">
          <input type="text" className="ref-link-input" value={refLink} readOnly />
          <CopyRefLinkButton link={refLink} />
        </div>
        <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.25)", marginTop: ".75rem", lineHeight: 1.6 }}>
          Friends can use your code <strong style={{ color: "rgba(255,255,255,.5)" }}>{myCode}</strong> or your username <strong style={{ color: "rgba(255,255,255,.5)" }}>@{user.username}</strong> when registering.
          You earn <strong style={{ color: isPremium ? "#ffd700" : "#5fefa5" }}>{isPremium ? "+20 tokens (Premium bonus!)" : "+10 tokens"}</strong> for each successful registration.
        </p>
      </div>

      <div className="dash-card">
        <div className="ref-invited-header">
          <span className="ref-invited-title">Invited Users</span>
          <span className="ref-invited-count">{totalRefs}</span>
        </div>

        {referralsRaw.length === 0 ? (
          <div className="ref-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Nobody yet. Share your link and start earning!
          </div>
        ) : (
          referralsRaw.map((r) => (
            <div className="ref-user-row" key={r.id}>
              <SafeImg src={r.referred.profile?.avatar ? `/${r.referred.profile.avatar}` : null} className="ref-user-avatar" />
              <div className="ref-user-info">
                <div className="ref-user-name">@{r.referred.username}</div>
                <div className="ref-user-date">{r.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</div>
              </div>
              <span className="ref-token-badge">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" /></svg>
                +{r.tokensGiven} tokens
              </span>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".45rem", marginTop: "1.4rem", flexWrap: "wrap" }}>
            <a href={`/dashboard/referral?page=${Math.max(1, page - 1)}`} style={cssTextToObj(page <= 1 ? btnDisabl : btnNormal)}>← Prev</a>
            {pageNumbers.map((i) => (
              <a key={i} href={`/dashboard/referral?page=${i}`} style={cssTextToObj(i === page ? btnActive : btnNormal)}>{i}</a>
            ))}
            <a href={`/dashboard/referral?page=${Math.min(totalPages, page + 1)}`} style={cssTextToObj(page >= totalPages ? btnDisabl : btnNormal)}>Next →</a>
          </div>
        )}
      </div>
    </>
  );
}

function cssTextToObj(css: string): React.CSSProperties {
  const obj: Record<string, string> = {};
  css.split(";").forEach((rule) => {
    const [k, v] = rule.split(":");
    if (!k || !v) return;
    const camel = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    obj[camel] = v.trim();
  });
  return obj as React.CSSProperties;
}
