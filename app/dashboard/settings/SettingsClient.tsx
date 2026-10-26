"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { COUNTRIES } from "@/lib/countries";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";

type LoginSession = { browser: string; ipDisplay: string | null; deviceType: string; loggedAt: string };

type Props = {
  username: string;
  email: string;
  userId: number;
  canChangeUsername: boolean;
  usernameNextChange: number | null;
  twoFaEnabled: boolean;
  twofaSecret: string;
  twofaUri: string;
  regionCode: string;
  regionName: string;
  loginSessions: LoginSession[];
};

type SensitiveAction = "change_username" | "change_email" | "change_password" | "delete_account";

export default function SettingsClient(props: Props) {
  const t = useT();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["sec-username"]));
  const [twoFaEnabled, setTwoFaEnabled] = useState(props.twoFaEnabled);

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Field state ──
  const [newUsername, setNewUsername] = useState(props.username);
  const [usernameStatus, setUsernameStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwStatus, setPwStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const [disable2faCode, setDisable2faCode] = useState("");
  const [status2fa, setStatus2fa] = useState<{ text: string; ok: boolean } | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSent, setDeleteSent] = useState(false);

  // ── 2FA verify modal (for sensitive actions) ──
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const pendingRef = useRef<((code: string) => void) | null>(null);

  function requestSensitive(action: SensitiveAction, run: (code: string) => void) {
    if (twoFaEnabled) {
      pendingRef.current = run;
      setVerifyCode("");
      setVerifyStatus(null);
      setVerifyOpen(true);
    } else {
      run("");
    }
  }

  function submitVerify() {
    if (verifyCode.trim().length !== 6) {
      setVerifyStatus({ text: "Enter a 6-digit code", ok: false });
      return;
    }
    setVerifyOpen(false);
    const cb = pendingRef.current;
    pendingRef.current = null;
    if (cb) cb(verifyCode.trim());
  }

  // ── Username ──
  async function saveUsername(twoFaCode: string) {
    setUsernameStatus({ text: "Saving...", ok: true });
    try {
      const res = await fetch("/api/settings/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, twoFaCode }),
      });
      const j = await res.json();
      if (res.ok) {
        setUsernameStatus({ text: `✓ Username updated successfully!`, ok: true });
        setTimeout(() => location.reload(), 1400);
      } else {
        setUsernameStatus({ text: `✗ ${j.error || "Error"}`, ok: false });
      }
    } catch {
      setUsernameStatus({ text: "✗ Network error", ok: false });
    }
  }

  // ── Email ──
  async function saveEmail(twoFaCode: string) {
    setEmailStatus({ text: "Saving...", ok: true });
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: emailPassword, twoFaCode }),
      });
      const j = await res.json();
      if (res.ok) {
        setEmailStatus({ text: `✓ ${j.message}`, ok: true });
      } else {
        setEmailStatus({ text: `✗ ${j.error || "Error"}`, ok: false });
      }
    } catch {
      setEmailStatus({ text: "✗ Network error", ok: false });
    }
  }

  // ── Password ──
  async function savePassword(twoFaCode: string) {
    setPwStatus({ text: "Saving...", ok: true });
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw, confirmPassword: confPw, twoFaCode }),
      });
      const j = await res.json();
      if (res.ok) {
        setPwStatus({ text: `✓ ${j.message}`, ok: true });
      } else {
        setPwStatus({ text: `✗ ${j.error || "Error"}`, ok: false });
      }
    } catch {
      setPwStatus({ text: "✗ Network error", ok: false });
    }
  }

  // ── 2FA disable ──
  async function disable2fa() {
    setStatus2fa({ text: "Saving...", ok: true });
    try {
      const res = await fetch("/api/settings/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disable2faCode }),
      });
      const j = await res.json();
      if (res.ok) {
        setStatus2fa({ text: "✓ 2FA disabled.", ok: true });
        setTwoFaEnabled(false);
        setTimeout(() => location.reload(), 1400);
      } else {
        setStatus2fa({ text: `✗ ${j.error || "Error"}`, ok: false });
      }
    } catch {
      setStatus2fa({ text: "✗ Network error", ok: false });
    }
  }

  // ── 2FA setup modal ──
  const [setupOpen, setSetupOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [setupStatus, setSetupStatus] = useState<{ text: string; ok: boolean } | null>(null);

  function openSetup() {
    setSetupOpen(true);
    setSetupCode("");
    setSetupStatus(null);
    if (props.twofaUri) {
      QRCode.toDataURL(props.twofaUri, { width: 160, margin: 1 }).then(setQrDataUrl);
    }
  }

  async function confirmSetup() {
    if (setupCode.trim().length !== 6) {
      setSetupStatus({ text: "✗ Enter a 6-digit code", ok: false });
      return;
    }
    setSetupStatus({ text: "Verifying...", ok: true });
    try {
      const res = await fetch("/api/settings/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: props.twofaSecret, code: setupCode.trim() }),
      });
      const j = await res.json();
      if (res.ok) {
        setSetupStatus({ text: "✓ 2FA enabled!", ok: true });
        setTimeout(() => {
          setSetupOpen(false);
          location.reload();
        }, 1200);
      } else {
        setSetupStatus({ text: `✗ ${j.error || "Invalid code"}`, ok: false });
      }
    } catch {
      setSetupStatus({ text: "✗ Network error", ok: false });
    }
  }

  // ── Delete account ──
  function confirmDelete() {
    if (!deletePassword) {
      showToast(t("Enter your password first"), "error");
      return;
    }
    requestSensitive("delete_account", doDelete);
  }

  async function doDelete(twoFaCode: string) {
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, twoFaCode }),
      });
      const j = await res.json();
      if (res.ok) {
        setDeleteSent(true);
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
    }
  }

  // ── Region dropdown ──
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionCode, setRegionCode] = useState(props.regionCode);
  const [regionNameSel, setRegionNameSel] = useState(props.regionCode ? props.regionName : "");
  const [regionSearch, setRegionSearch] = useState("");
  const [regionMsg, setRegionMsg] = useState<{ html: string; ok: boolean } | null>(null);
  const [currentRegionLabel, setCurrentRegionLabel] = useState(props.regionCode && props.regionCode !== "XX" ? props.regionName : "");
  const regionWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (regionWrapRef.current && !regionWrapRef.current.contains(e.target as Node)) setRegionOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function selectRegion(code: string, name: string) {
    setRegionCode(code);
    setRegionNameSel(name);
    setRegionOpen(false);
    setRegionSearch("");
  }

  async function saveRegion() {
    if (!regionCode) {
      setRegionMsg({ html: "✗ Please select a country first.", ok: false });
      return;
    }
    setRegionMsg({ html: "Saving...", ok: true });
    try {
      const res = await fetch("/api/settings/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionCode, regionName: regionNameSel }),
      });
      const j = await res.json();
      if (res.ok) {
        const lv = j.localViews ?? 0;
        setRegionMsg({
          html: `✓ Region saved! ${lv > 0 ? `Found <strong style="color:var(--accent)">${lv}</strong> existing local views from ${regionNameSel}.` : `No existing views from ${regionNameSel} yet.`}`,
          ok: true,
        });
        setCurrentRegionLabel(regionNameSel);
      } else {
        setRegionMsg({ html: `✗ ${j.error || "Failed to save"}`, ok: false });
      }
    } catch {
      setRegionMsg({ html: "✗ Network error", ok: false });
    }
  }

  const filteredCountries = Object.entries(COUNTRIES).filter(([, name]) => name.toLowerCase().includes(regionSearch.toLowerCase()));

  return (
    <>
      <div className="section-header">
        <h2>{t("Settings")}</h2>
        <p>{t("Manage your account information and security.")}</p>
      </div>

      <div className="acct-info-card">
        <div className="acct-info-header">
          <div className="acct-info-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div className="acct-info-header-title">{t("Account Information")}</div>
        </div>
        <div className="acct-info-grid">
          <div className="acct-info-item">
            <div className="acct-info-item-header">
              <div className="acct-info-item-icon" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <span className="acct-info-item-label">{t("Username")}</span>
            </div>
            <div className="acct-info-item-value">{props.username}</div>
          </div>
          <div className="acct-info-item">
            <div className="acct-info-item-header">
              <div className="acct-info-item-icon" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
              <span className="acct-info-item-label">{t("Email")}</span>
            </div>
            <div className="acct-info-item-value">{props.email}</div>
          </div>
          <div className="acct-info-item">
            <div className="acct-info-item-header">
              <div className="acct-info-item-icon" style={{ background: "rgba(52,211,153,.12)", color: "#34d399" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              </div>
              <span className="acct-info-item-label">{t("User ID")}</span>
            </div>
            <div className="acct-info-item-value">{props.userId}</div>
          </div>
        </div>
      </div>

      <div className="settings-v2">
        {/* Username */}
        <div className={`sv2-section ${openSections.has("sec-username") ? "open" : ""}`}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-username")}>
            <div className="sv2-icon" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div>
              <div className="sv2-title">{t("Username")}</div>
              <div className="sv2-sub">{t("Currently:")}{" "}<strong>@{props.username}</strong></div>
            </div>
            {!props.canChangeUsername && (
              <span className="sv2-cooldown">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {props.usernameNextChange}{t("d cooldown")}
              </span>
            )}
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            {props.canChangeUsername ? (
              <>
                <input type="text" className="sv2-input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} maxLength={30} />
                <p className="sv2-hint">{t("3–30 characters. Letters, numbers, underscores only. Can be changed once every 7 days.")}</p>
                <button className="sv2-btn sv2-btn-accent" onClick={() => requestSensitive("change_username", saveUsername)}>{t("Save Username")}</button>
                {usernameStatus && <div className="sv2-status" style={{ color: usernameStatus.ok ? "#34d399" : "#ff8080" }}>{usernameStatus.text}</div>}
              </>
            ) : (
              <p className="sv2-hint">{t("You can change your username again in")}{" "}<strong>{props.usernameNextChange} day{(props.usernameNextChange || 0) > 1 ? "s" : ""}</strong>.</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className={`sv2-section ${openSections.has("sec-email") ? "open" : ""}`}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-email")}>
            <div className="sv2-icon" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <div>
              <div className="sv2-title">{t("Email Address")}</div>
              <div className="sv2-sub">{t("Currently:")}{" "}<strong>{props.email}</strong></div>
            </div>
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            <input type="email" className="sv2-input" placeholder={t("New email address")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <input type="password" className="sv2-input" placeholder={t("Confirm with current password")} value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
            <button className="sv2-btn sv2-btn-purple" onClick={() => requestSensitive("change_email", saveEmail)}>{t("Save Email")}</button>
            {emailStatus && <div className="sv2-status" style={{ color: emailStatus.ok ? "#34d399" : "#ff8080" }}>{emailStatus.text}</div>}
          </div>
        </div>

        {/* Password */}
        <div className={`sv2-section ${openSections.has("sec-password") ? "open" : ""}`}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-password")}>
            <div className="sv2-icon" style={{ background: "rgba(52,211,153,.1)", color: "#34d399" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <div>
              <div className="sv2-title">{t("Password")}</div>
              <div className="sv2-sub">{t("Change your login password")}</div>
            </div>
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            <input type="password" className="sv2-input" placeholder={t("Current password")} value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            <input type="password" className="sv2-input" placeholder={t("New password (min. 6 characters)")} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <input type="password" className="sv2-input" placeholder={t("Confirm new password")} value={confPw} onChange={(e) => setConfPw(e.target.value)} />
            <button className="sv2-btn sv2-btn-green" onClick={() => requestSensitive("change_password", savePassword)}>{t("Change Password")}</button>
            {pwStatus && <div className="sv2-status" style={{ color: pwStatus.ok ? "#34d399" : "#ff8080" }}>{pwStatus.text}</div>}
          </div>
        </div>

        {/* 2FA */}
        <div className={`sv2-section ${openSections.has("sec-2fa") ? "open" : ""}`}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-2fa")}>
            <div className="sv2-icon" style={{ background: "rgba(251,191,36,.1)", color: "#fbbf24" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <div className="sv2-title">{t("Two-Factor Authentication")}</div>
              <div className="sv2-sub">{twoFaEnabled ? <span style={{ color: "#34d399" }}>{t("✓ Enabled")}</span> : "Extra security for your account"}</div>
            </div>
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            {!twoFaEnabled ? (
              <>
                <div className="sv2-row">
                  <div>
                    <div className="sv2-row-label">{t("Google Authenticator 2FA")}</div>
                    <div className="sv2-row-sub">{t("Scan a QR code with Google Authenticator to enable 2FA.")}</div>
                  </div>
                </div>
                <button className="sv2-btn sv2-btn-yellow" onClick={openSetup}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  {t("Set Up 2FA")}
                </button>
              </>
            ) : (
              <>
                <div className="sv2-row">
                  <div>
                    <div className="sv2-row-label" style={{ color: "#34d399" }}>{t("2FA is active")}</div>
                    <div className="sv2-row-sub">{t("Your account is protected with Google Authenticator.")}</div>
                  </div>
                </div>
                <input type="text" className="sv2-input" placeholder={t("Enter 6-digit code to disable")} maxLength={6} inputMode="numeric" value={disable2faCode} onChange={(e) => setDisable2faCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <button className="sv2-btn sv2-btn-red" onClick={disable2fa}>{t("Disable 2FA")}</button>
              </>
            )}
            {status2fa && <div className="sv2-status" style={{ color: status2fa.ok ? "#34d399" : "#ff8080" }}>{status2fa.text}</div>}
          </div>
        </div>

        {/* Session Manager */}
        <div className={`sv2-section ${openSections.has("sec-sessions") ? "open" : ""}`}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-sessions")}>
            <div className="sv2-icon" style={{ background: "rgba(52,211,153,.1)", color: "#34d399" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="8" cy="8" r="3" /><path d="M3 12h18" /><circle cx="16" cy="16" r="3" /></svg>
            </div>
            <div>
              <div className="sv2-title">{t("Session Manager")}</div>
              <div className="sv2-sub">{t("Manage your active login sessions.")}</div>
            </div>
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            <div className="session-list">
              {props.loginSessions.length === 0 ? (
                <div className="session-empty">{t("No login sessions found.")}</div>
              ) : (
                props.loginSessions.map((sess, i) => {
                  const when = new Date(sess.loggedAt);
                  const whenStr = `${String(when.getDate()).padStart(2, "0")}/${String(when.getMonth() + 1).padStart(2, "0")}/${when.getFullYear()}, ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}:${String(when.getSeconds()).padStart(2, "0")}`;
                  return (
                    <div className="session-item" key={i}>
                      <div className={`session-dot ${i === 0 ? "active" : "old"}`} />
                      <div className="session-info">
                        <div className="session-browser">{sess.browser || "Unknown Browser"}</div>
                        <div className="session-meta">
                          {(sess.deviceType || "Unknown Device").replace(/^./, (c) => c.toUpperCase())}<br />
                          {sess.ipDisplay || "Unknown IP Address"}<br />
                          {whenStr}
                        </div>
                      </div>
                      {i === 0 && <div className="session-badge">{t("Current Session")}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Region */}
        <div className={`sv2-section ${openSections.has("sec-region") ? "open" : ""}`}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-region")}>
            <div className="sv2-icon" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <div>
              <div className="sv2-title">{t("Leaderboard Region")}</div>
              <div className="sv2-sub">{t("Choose your country for the local leaderboard")}</div>
            </div>
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            <p style={{ fontSize: ".82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {t("Select your country to appear on the")}{" "}<strong style={{ color: "var(--text)" }}>{t("local leaderboard")}</strong>{t(". This is based on where you are from, not where your visitors come from.")}
            </p>
            <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginBottom: ".25rem" }}>
              {currentRegionLabel ? <>{t("Current region:")}{" "}<strong style={{ color: "var(--text)" }}>{currentRegionLabel}</strong></> : "No region set yet."}
            </div>

            <div className="region-dd-wrap" ref={regionWrapRef}>
              <div className={`region-dd-wrap ${regionOpen ? "open" : ""}`}>
                <div className="region-dd-trigger" onClick={() => setRegionOpen((o) => !o)}>
                  <span>{regionNameSel || "— Select your country —"}</span>
                  <svg className="region-dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div className="region-dd-list">
                  <div className="region-dd-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ color: "rgba(255,255,255,.3)", flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input type="text" className="region-dd-search" placeholder={t("Search country…")} value={regionSearch} onChange={(e) => setRegionSearch(e.target.value)} autoComplete="off" />
                  </div>
                  <div className="region-dd-options">
                    {filteredCountries.map(([code, name]) => (
                      <div key={code} className={`region-dd-option ${regionCode === code ? "selected" : ""}`} onClick={() => selectRegion(code, name)}>
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button className="sv2-btn" onClick={saveRegion} style={{ background: "linear-gradient(135deg,color-mix(in srgb, var(--accent) 30%, transparent),color-mix(in srgb, var(--accent) 10%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", color: "var(--accent)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {t("Save Region")}
            </button>
            {regionMsg && <div style={{ fontSize: ".8rem", color: regionMsg.ok ? "#34d399" : "#ff8080" }} dangerouslySetInnerHTML={{ __html: regionMsg.html }} />}
          </div>
        </div>

        {/* Delete Account */}
        <div className={`sv2-section ${openSections.has("sec-delete") ? "open" : ""}`} style={{ borderColor: "rgba(239,68,68,.25)" }}>
          <div className="sv2-section-header" onClick={() => toggleSection("sec-delete")}>
            <div className="sv2-icon" style={{ background: "rgba(239,68,68,.12)", color: "#ef4444" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
            </div>
            <div>
              <div className="sv2-title" style={{ color: "#ff8080" }}>{t("Delete Account")}</div>
              <div className="sv2-sub">{t("Permanent and cannot be undone")}</div>
            </div>
            <svg className="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          <div className="sv2-body">
            {deleteSent ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: ".85rem", background: "rgba(255,80,80,.06)", border: "1px solid rgba(255,80,80,.2)", borderRadius: 12, padding: "1rem 1.1rem" }}>
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,80,80,.12)", border: "1px solid rgba(255,80,80,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff8080" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: ".83rem", fontWeight: 600, color: "#ff8080", marginBottom: ".3rem" }}>{t("Confirmation email sent")}</div>
                  <div style={{ fontSize: ".78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{t("Check your inbox and click the link to")}{" "}<strong style={{ color: "#ff9090" }}>{t("permanently delete")}</strong>{" "}{t("your account. Link expires in")}{" "}<strong style={{ color: "var(--text)" }}>{t("1 hour")}</strong>.</div>
                </div>
              </div>
            ) : (
              <>
                <input type="password" className="sv2-input danger" placeholder={t("Enter your password to confirm")} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                <button className="sv2-btn sv2-btn-red" onClick={confirmDelete}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                  {t("Delete My Account Permanently")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2FA Verify Modal */}
      {verifyOpen && (
        <div className="sv2-modal-overlay">
          <div className="sv2-modal" style={{ maxWidth: 380, textAlign: "center" }}>
            <button className="sv2-modal-close" onClick={() => setVerifyOpen(false)}>✕</button>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(251,191,36,.15)", border: "2px solid rgba(251,191,36,.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto .9rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" width="26" height="26"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="sv2-modal-title" style={{ color: "#fbbf24" }}>{t("Two-Factor Auth")}</div>
            <div className="sv2-modal-sub" style={{ marginBottom: "1.1rem" }}>{t("Open Google Authenticator and enter the 6-digit code for your account.")}</div>
            <input
              type="text"
              className="sv2-input"
              placeholder="· · · · · ·"
              maxLength={6}
              inputMode="numeric"
              style={{ textAlign: "center", letterSpacing: ".35em", fontSize: "1.3rem", padding: ".75rem 1rem" }}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submitVerify()}
              autoFocus
            />
            <button className="sv2-btn sv2-btn-yellow" style={{ marginTop: ".85rem" }} onClick={submitVerify}>{t("Verify Code")}</button>
            {verifyStatus && <div className="sv2-status" style={{ textAlign: "center", marginTop: ".6rem", color: verifyStatus.ok ? "#34d399" : "#ff8080" }}>{verifyStatus.text}</div>}
            <div style={{ marginTop: ".85rem" }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setVerifyOpen(false); }} style={{ fontSize: ".75rem", color: "var(--text-muted)", textDecoration: "none" }}>{t("← Cancel")}</a>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {setupOpen && (
        <div className="sv2-modal-overlay">
          <div className="sv2-modal">
            <button className="sv2-modal-close" onClick={() => setSetupOpen(false)}>✕</button>
            <div className="sv2-modal-title">{t("Set Up 2FA")}</div>
            <div className="sv2-modal-sub">{t("Scan this QR code with Google Authenticator, then enter the 6-digit code to confirm.")}</div>
            {!qrDataUrl ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem", fontSize: ".8rem" }}>{t("Generating QR code...")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                <div className="sv2-qr-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt={t("2FA QR code")} />
                </div>
                <p style={{ fontSize: ".72rem", color: "var(--text-muted)", textAlign: "center" }}>
                  {t("Can't scan? Enter this key manually:")}<br />
                  <code style={{ color: "var(--accent)", letterSpacing: ".1em", fontSize: ".8rem" }}>{props.twofaSecret}</code>
                </p>
                <input
                  type="text"
                  className="sv2-input"
                  placeholder={t("Enter 6-digit code from app")}
                  maxLength={6}
                  inputMode="numeric"
                  style={{ textAlign: "center", letterSpacing: ".2em", fontSize: "1.1rem" }}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                />
                <button className="sv2-btn sv2-btn-yellow" style={{ width: "100%" }} onClick={confirmSetup}>{t("Confirm & Enable 2FA")}</button>
                {setupStatus && <div className="sv2-status" style={{ textAlign: "center", color: setupStatus.ok ? "#34d399" : "#ff8080" }}>{setupStatus.text}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
