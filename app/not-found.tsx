export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "4rem", fontFamily: "var(--font-sans)" }}>404</h2>
        <p style={{ color: "var(--text-muted)" }}>Page not found.</p>
        <a href="/" className="btn btn-secondary" style={{ marginTop: "1.5rem" }}>Home</a>
      </div>
    </div>
  );
}
