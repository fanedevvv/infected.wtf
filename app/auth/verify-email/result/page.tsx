import RedirectCountdown from "@/components/RedirectCountdown";

export default async function VerifyEmailResultPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params.status || "invalid";

  return (
    <div className="verify-wrap">
      <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <div className="verify-card">
        <a href="/" className="site-logo">INFECTED.WTF</a>

        {status === "success" && (
          <>
            <div className="verify-icon success">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c6ff3d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="7 12 10.5 15.5 17 9" /></svg>
            </div>
            <h1 className="verify-title success-text">Email Verified!</h1>
            <p className="verify-desc">
              Your account is now <strong>active</strong>.<br />
              Welcome aboard — let&apos;s build your profile!
            </p>
            <div className="redirect-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Redirecting to dashboard in <RedirectCountdown seconds={3} to="/dashboard" />s
            </div>
            <div className="verify-actions">
              <a href="/dashboard" className="btn btn-primary btn-full">Go to Dashboard →</a>
            </div>
          </>
        )}

        {status === "expired" && (
          <>
            <div className="verify-icon warning">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h1 className="verify-title">Link Expired</h1>
            <p className="verify-desc">
              The verification link is <strong>no longer valid</strong> (links expire after 24 hours).<br />
              Register again to get a new link.
            </p>
            <div className="verify-actions">
              <a href="/register" className="btn btn-primary btn-full">Register Again</a>
              <a href="/login" className="btn btn-secondary btn-full">Sign In</a>
            </div>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="verify-icon error">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff5555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <h1 className="verify-title">Invalid Link</h1>
            <p className="verify-desc">
              This verification link is <strong>invalid or doesn&apos;t exist</strong>.<br />
              Make sure you copied the full link from the email.
            </p>
            <div className="verify-actions">
              <a href="/register" className="btn btn-primary btn-full">Create New Account</a>
              <a href="/login" className="btn btn-secondary btn-full">Sign In</a>
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
