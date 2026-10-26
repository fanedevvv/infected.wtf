import { redirect } from "next/navigation";
import styles from "./maintenance.module.css";
import MaintenancePoller from "./MaintenancePoller";
import LogoutLink from "./LogoutLink";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/auth-helpers";

const SIZES = [4, 5, 6, 4, 5, 3, 6, 4, 5, 4, 3, 5];
const DELAYS = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 0.2];
const DURS = [7, 6, 8, 9, 6, 7, 8, 6, 9, 7, 8, 6];
const LEFTS = [5, 12, 22, 35, 48, 57, 65, 72, 80, 88, 93, 15];

export default async function MaintenancePage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  if (user && isStaff(user)) redirect("/");

  return (
    <div className={styles.wrap}>
      <MaintenancePoller />
      <div className={styles.particles} aria-hidden="true">
        {SIZES.map((s, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{ width: s, height: s, left: `${LEFTS[i]}%`, ["--delay" as string]: `${DELAYS[i]}s`, ["--dur" as string]: `${DURS[i]}s` }}
          />
        ))}
      </div>

      <div className={styles.cardOuter}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <svg viewBox="0 0 36 36" fill="none">
              <path d="M21.5 5.5C19.2 4.6 16.5 5 14.3 6.7L18 10.4l-2.1 2.1-3.8-3.8C10.4 11 10 13.7 10.9 16L5.5 21.4a2.5 2.5 0 0 0 3.5 3.6l5.4-5.4c2.3.9 5 .5 6.8-1.3A7 7 0 0 0 21.5 5.5Z" fill="url(#g1)" opacity=".9" />
              <circle cx="25" cy="26" r="5" stroke="url(#g2)" strokeWidth="2" fill="none" />
              <path d="M25 23v3l2 2" stroke="url(#g2)" strokeWidth="1.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="g1" x1="5" y1="5" x2="28" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c6ff3d" /><stop offset="1" stopColor="#8fc21a" />
                </linearGradient>
                <linearGradient id="g2" x1="20" y1="21" x2="30" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c6ff3d" /><stop offset="1" stopColor="#8fc21a" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className={styles.title}>Maintenance</h1>

          <p className={styles.subtitle}>
            Maintenance will end soon.<br />
            We&apos;re working hard to get everything back up for you.
          </p>

          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Back online soon
          </div>

          {user && <LogoutLink className={styles.logoutLink} />}
        </div>
      </div>
    </div>
  );
}
