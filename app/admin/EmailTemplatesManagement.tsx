"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/lib/toast";

type EmailTemplate = { id: number; templateKey: string; subject: string; bodyHtml: string; availableVariables: string[]; updatedAt: string };

const PREVIEW_DEFAULTS: Record<string, string> = {
  site_name: "INFECTED.WTF",
  username: "exampleuser",
  verify_url: "https://infected.wtf/auth/verify-email?token=preview",
  reset_url: "https://infected.wtf/reset-password?token=preview",
  confirm_url: "https://infected.wtf/auth/confirm-action?token=preview",
  settings_url: "https://infected.wtf/dashboard?page=settings",
  new_email: "newaddress@gmail.com",
  time: new Date().toLocaleString(),
  browser: "Chrome",
  device: "desktop",
  ip: "86.*.*.*",
  country: "RO",
};

function interpolate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => vars[key] ?? `{{${key}}}`);
}

async function callAction(body: Record<string, unknown>) {
  const res = await fetch("/api/admin_action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function EmailTemplatesManagement({ emailTemplates }: { emailTemplates: EmailTemplate[] }) {
  const [templates, setTemplates] = useState(emailTemplates);
  const [selectedId, setSelectedId] = useState<number | null>(emailTemplates[0]?.id ?? null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) || null, [templates, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setSubject(selected.subject);
    setBodyHtml(selected.bodyHtml);
    const vars: Record<string, string> = {};
    selected.availableVariables.forEach((v) => { vars[v] = PREVIEW_DEFAULTS[v] || `valoare_${v}`; });
    setPreviewVars(vars);
  }, [selected?.id]);

  const previewSubject = useMemo(() => interpolate(subject, previewVars), [subject, previewVars]);
  const previewHtml = useMemo(() => interpolate(bodyHtml, previewVars), [bodyHtml, previewVars]);

  async function save() {
    if (!selected || !subject.trim() || !bodyHtml.trim()) {
      showToast("Subject and body are required", "error");
      return;
    }
    setSaving(true);
    try {
      const json = await callAction({ action: "update_email_template", template_id: selected.id, subject: subject.trim(), body_html: bodyHtml });
      if (json.success) {
        showToast("Template saved", "success");
        setTemplates((prev) => prev.map((t) => (t.id === selected.id ? { ...t, subject: subject.trim(), bodyHtml, updatedAt: new Date().toISOString() } : t)));
      } else {
        showToast(json.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setSaving(false);
  }

  async function sendTest() {
    if (!selected || !testEmail.trim()) return;
    setTestSending(true);
    try {
      const json = await callAction({ action: "send_test_email", template_id: selected.id, recipient: testEmail.trim(), variables: previewVars });
      if (json.success) {
        showToast(`Test sent to ${testEmail.trim()}`, "success");
      } else {
        showToast(json.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setTestSending(false);
  }

  return (
    <div className="dash-card" style={{ marginBottom: "1.5rem" }}>
      <div className="dash-card-header" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: "1rem", marginBottom: "1.2rem" }}>
        <span className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" /></svg>
          Email Templates
        </span>
        <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)", fontWeight: 400 }}>Owner only — reset password, verify email, etc.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.2rem", alignItems: "start" }}>
        {/* ── Template list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                textAlign: "left", padding: ".6rem .75rem", borderRadius: 8, cursor: "pointer",
                border: "1px solid " + (selectedId === t.id ? "rgba(124,58,237,.5)" : "rgba(255,255,255,.08)"),
                background: selectedId === t.id ? "rgba(124,58,237,.12)" : "rgba(255,255,255,.02)",
              }}
            >
              <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#fff" }}>{t.templateKey}</div>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
            </button>
          ))}
        </div>

        {/* ── Editor + preview ── */}
        {!selected ? (
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: ".85rem" }}>No templates found.</div>
        ) : (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginBottom: ".9rem" }}>
              {selected.availableVariables.map((v) => (
                <span key={v} style={{ fontSize: ".7rem", padding: ".2rem .55rem", borderRadius: 20, border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.55)", fontFamily: "monospace" }}>
                  {`{{${v}}}`}
                </span>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
              {/* Left: editor */}
              <div>
                <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: "100%", padding: ".6rem .8rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box", marginBottom: ".9rem" }}
                />

                <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>Body HTML</label>
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={14}
                  style={{ width: "100%", padding: ".7rem .8rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".75rem", fontFamily: "monospace", outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: ".9rem" }}
                />

                {selected.availableVariables.length > 0 && (
                  <>
                    <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>Preview values</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", marginBottom: "1rem" }}>
                      {selected.availableVariables.map((v) => (
                        <input
                          key={v}
                          value={previewVars[v] || ""}
                          onChange={(e) => setPreviewVars((prev) => ({ ...prev, [v]: e.target.value }))}
                          placeholder={v}
                          style={{ padding: ".45rem .6rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, color: "#fff", fontSize: ".75rem", outline: "none" }}
                        />
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={save} disabled={saving}
                    style={{ padding: ".6rem 1.2rem", background: "linear-gradient(135deg,#7c3aed,#1e40af)", border: "none", borderRadius: 8, color: "#fff", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", opacity: saving ? .6 : 1 }}>
                    {saving ? "Saving…" : "Save template"}
                  </button>
                  <button onClick={() => setTestOpen((v) => !v)}
                    style={{ padding: ".6rem 1.1rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "rgba(255,255,255,.8)", fontSize: ".82rem", fontWeight: 600, cursor: "pointer" }}>
                    Send test
                  </button>
                  <span style={{ fontSize: ".7rem", color: "rgba(255,255,255,.3)" }}>Updated {new Date(selected.updatedAt).toLocaleString()}</span>
                </div>

                {testOpen && (
                  <div style={{ display: "flex", gap: ".5rem", marginTop: ".7rem" }}>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your@email.com"
                      onKeyDown={(e) => { if (e.key === "Enter") sendTest(); }}
                      style={{ flex: 1, padding: ".5rem .7rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".8rem", outline: "none" }}
                    />
                    <button onClick={sendTest} disabled={testSending || !testEmail.trim()}
                      style={{ padding: ".5rem 1rem", background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.4)", borderRadius: 8, color: "#a78bfa", fontSize: ".8rem", fontWeight: 700, cursor: "pointer", opacity: testSending ? .6 : 1 }}>
                      {testSending ? "…" : "Send"}
                    </button>
                  </div>
                )}
              </div>

              {/* Right: live preview */}
              <div>
                <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>Live preview</label>
                <div style={{ padding: ".6rem .8rem", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px 8px 0 0", fontSize: ".8rem", color: "rgba(255,255,255,.7)" }}>
                  <strong style={{ color: "#fff" }}>Subject:</strong> {previewSubject || "—"}
                </div>
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  style={{ width: "100%", height: 480, border: "1px solid rgba(255,255,255,.08)", borderTop: "none", borderRadius: "0 0 8px 8px", background: "#fff" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
