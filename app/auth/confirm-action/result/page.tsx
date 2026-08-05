import RedirectCountdown from "@/components/RedirectCountdown";

const TYPE_LABELS: Record<string, string> = {
  email_change: "Email Change",
  change_password: "Password Change",
  delete_account: "Account Deletion",
  relogin: "Identity Verification",
};

export default async function ConfirmActionResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; email?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "invalid";
  const type = params.type || "";
  const email = params.email || "";
  const typeLabel = TYPE_LABELS[type] || "Action";
  const isDelete = type === "delete_account";
  const isRelogin = type === "relogin";

  return (
    <div className="confirm-wrap">
      <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <div className="confirm-card">
        <a href="/" className="site-logo">INFECTED.WTF</a>

        {status === "success" ? (
          isDelete ? (
            <>
              <div className="ci danger">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff8080" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
              </div>
              <h1 className="confirm-title danger-text">Account Deleted</h1>
              <p className="confirm-desc">Your account and all associated data have been <strong>permanently deleted</strong>. We&apos;re sorry to see you go.</p>
              <div className="btn-row">
                <a href="/" className="btn btn-secondary btn-full">Go Home</a>
              </div>
            </>
          ) : isRelogin ? (
            <>
              <div className="ci success">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="7 12 10.5 15.5 17 9" /></svg>
              </div>
              <h1 className="confirm-title success-text">Identity Confirmed!</h1>
              <p className="confirm-desc">Identity confirmed. Redirecting to your dashboard…</p>
              <div className="redirect-bar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Redirecting in <RedirectCountdown seconds={3} to="/dashboard" />s
              </div>
              <div className="btn-row">
                <a href="/dashboard" className="btn btn-primary btn-full">Go to Dashboard →</a>
              </div>
            </>
          ) : (
            <>
              <div className="ci success">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="7 12 10.5 15.5 17 9" /></svg>
              </div>
              <h1 className="confirm-title success-text">{typeLabel} Confirmed!</h1>
              <p className="confirm-desc">
                {type === "email_change" ? (
                  <>Your email has been updated to <strong>{email}</strong>.</>
                ) : (
                  "Your password has been changed successfully."
                )}
              </p>
              <div className="redirect-bar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Redirecting in <RedirectCountdown seconds={3} to="/dashboard?page=settings" />s
              </div>
              <div className="btn-row">
                <a href="/dashboard?page=settings" className="btn btn-primary btn-full">Go to Settings →</a>
              </div>
            </>
          )
        ) : status === "already" ? (
          <>
            <div className="ci success">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="7 12 10.5 15.5 17 9" /></svg>
            </div>
            <h1 className="confirm-title success-text">Already Confirmed</h1>
            <p className="confirm-desc">This action was already completed. No changes were made.</p>
            <div className="btn-row">
              <a href="/dashboard" className="btn btn-primary btn-full">Dashboard</a>
              <a href="/" className="btn btn-secondary btn-full">Home</a>
            </div>
          </>
        ) : (
          <>
            <div className="ci warning">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h1 className="confirm-title">Invalid or Expired Link</h1>
            <p className="confirm-desc">This confirmation link is <strong>invalid or has expired</strong>. Please try the action again from your settings.</p>
            <div className="btn-row">
              <a href="/dashboard?page=settings" className="btn btn-primary btn-full">Back to Settings</a>
              <a href="/" className="btn btn-secondary btn-full">Home</a>
            </div>
          </>
        )}

        <div className="divider" />
        <p style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
          Need help? <a href="/support" style={{ color: "var(--accent)", textDecoration: "none" }}>Contact Support</a>
        </p>
      </div>
    </div>
  );
}
