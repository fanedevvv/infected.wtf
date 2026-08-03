import styles from "./banned.module.css";
import BanPoller from "./BanPoller";

const SIZES = [4, 5, 6, 4, 5, 3, 6, 4, 5, 4, 3, 5];
const DELAYS = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 0.2];
const DURS = [7, 6, 8, 9, 6, 7, 8, 6, 9, 7, 8, 6];
const LEFTS = [5, 12, 22, 35, 48, 57, 65, 72, 80, 88, 93, 15];

export default async function BannedPage({ searchParams }: { searchParams: Promise<{ u?: string; uid?: string }> }) {
  const params = await searchParams;
  const raw = params.u;
  const isPermanent = !raw || raw === "permanent";
  const banUntil = !isPermanent ? raw! : null;

  let daysLeft: number | null = null;
  if (!isPermanent && banUntil) {
    const diff = new Date(banUntil).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diff / 86400000));
    if (daysLeft === 0 && diff > 0) daysLeft = 1;
  }

  const pollUid = params.uid && /^\d+$/.test(params.uid) ? parseInt(params.uid, 10) : 0;


  return (
    <div className={styles.wrap}>
      <BanPoller uid={pollUid} />
      <div className={styles.particles} aria-hidden="true">
        {SIZES.map((s, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{ width: s, height: s, left: `${LEFTS[i]}%`, ["--delay" as string]: `${DELAYS[i]}s`, ["--dur" as string]: `${DURS[i]}s` }}
          />
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <svg viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="13" stroke="url(#rb1)" strokeWidth="2.2" fill="none" />
            <line x1="8.5" y1="8.5" x2="27.5" y2="27.5" stroke="url(#rb2)" strokeWidth="2.4" strokeLinecap="round" />
            <defs>
              <linearGradient id="rb1" x1="5" y1="5" x2="31" y2="31" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ef4444" /><stop offset="1" stopColor="#ff6b00" />
              </linearGradient>
              <linearGradient id="rb2" x1="5" y1="5" x2="31" y2="31" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ef4444" /><stop offset="1" stopColor="#ff6b00" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Account Suspended</h1>

        <p className={styles.subtitle}>
          Your account has been suspended by an administrator.<br />
          If you believe this is a mistake, please contact the staff.
        </p>

        {isPermanent ? (
          <div className={`${styles.banPill} ${styles.permanent}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Permanent ban
          </div>
        ) : daysLeft !== null ? (
          <div className={`${styles.banPill} ${styles.temporary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {daysLeft === 1
              ? "Expires today"
              : daysLeft <= 7
                ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining`
                : `${daysLeft} days remaining — until ${new Date(banUntil!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          </div>
        ) : null}

        <div className={styles.actions}>
          <a href="/login" className={`${styles.btnAction} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Back to Login
          </a>
          <a href="/" className={`${styles.btnAction} ${styles.btnGhost}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </a>
        </div>

        <div className={styles.infoBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Contact an administrator to appeal this decision
        </div>
      </div>
    </div>
  );
}
