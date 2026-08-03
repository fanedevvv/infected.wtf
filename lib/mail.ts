import nodemailer from "nodemailer";

const SITE_NAME = process.env.SITE_NAME || "INFECTED.WTF";

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[mail] SMTP not configured — skipping send to ${to}: ${subject}`);
    return false;
  }
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, html, text });
    return true;
  } catch (e) {
    console.error("[mail] send failed", e);
    return false;
  }
}

function baseTemplate(opts: {
  accent: string;
  accent2: string;
  logo: string;
  heading: string;
  body: string;
  btnLabel: string;
  btnUrl: string;
  small: string;
}) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16,#0d0d20);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:linear-gradient(90deg,${opts.accent},${opts.accent2})}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:${opts.accent};margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 24px}
  .btn{display:inline-block;background:linear-gradient(135deg,${opts.accent},${opts.accent2});color:#000!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .small a{color:${opts.accent};text-decoration:none}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">${opts.logo}</div>
    <h1>${opts.heading}</h1>
    <p>${opts.body}</p>
    <a href="${opts.btnUrl}" class="btn">${opts.btnLabel}</a>
    <div class="divider"></div>
    <p class="small">${opts.small}</p>
  </div>
  <div class="footer">&copy; ${opts.logo} &middot; All rights reserved</div>
</div></div></body></html>`;
}

export async function sendVerificationEmail(email: string, username: string, token: string) {
  const url = `${process.env.SITE_URL}/auth/verify-email?token=${token}`;
  const html = baseTemplate({
    accent: "#39ff14",
    accent2: "#ff1a3c",
    logo: SITE_NAME,
    heading: "Verify your email address",
    body: `Hey <strong style="color:#fff">${username}</strong>, you're one step away! Click the button below to verify your email and activate your account.`,
    btnLabel: "Verify My Email",
    btnUrl: url,
    small: `This link expires in 24 hours. If you didn't create an account on ${SITE_NAME}, you can safely ignore this email.`,
  });
  const text = `Verify your ${SITE_NAME} account\n\nHi ${username},\n\nClick the link below to verify your email:\n${url}\n\nExpires in 24 hours.\n`;
  return sendMail(email, `Verify your email — ${SITE_NAME}`, html, text);
}

export async function sendPasswordResetEmail(email: string, username: string, token: string) {
  const url = `${process.env.SITE_URL}/reset-password?token=${token}`;
  const html = baseTemplate({
    accent: "#34d399",
    accent2: "#059669",
    logo: SITE_NAME,
    heading: "Reset your password",
    body: `Hey <strong style="color:#fff">${username}</strong>, click the button below to choose a new password.`,
    btnLabel: "Reset Password",
    btnUrl: url,
    small: "This link expires in 1 hour. If you didn't request this, ignore this email.",
  });
  const text = `Reset your ${SITE_NAME} password\n\nHi ${username},\n\n${url}\n\nExpires in 1 hour.\n`;
  return sendMail(email, `Reset your password — ${SITE_NAME}`, html, text);
}

export async function sendReloginVerificationEmail(email: string, username: string, token: string) {
  const url = `${process.env.SITE_URL}/auth/confirm-action?token=${token}&type=relogin`;
  const html = baseTemplate({
    accent: "#39ff14",
    accent2: "#ff1a3c",
    logo: SITE_NAME,
    heading: `Welcome back, ${username}!`,
    body: `It's been a while since you last logged in to ${SITE_NAME}. For your security, please confirm it's you by clicking the button below.`,
    btnLabel: "Yes, It's Me — Continue",
    btnUrl: url,
    small: "This link expires in 1 hour. If you didn't try to log in, change your password immediately.",
  });
  const text = `Welcome back to ${SITE_NAME}\n\nHi ${username},\n\nPlease confirm it's you:\n${url}\n\nExpires in 1 hour.\n`;
  return sendMail(email, `Confirm it's you — ${SITE_NAME}`, html, text);
}

export async function sendNewLoginEmail(
  email: string,
  username: string,
  info: { time: string; browser: string; device: string; ip: string; country: string }
) {
  const settingsUrl = `${process.env.SITE_URL}/dashboard/settings`;
  const html = baseTemplate({
    accent: "#f59e0b",
    accent2: "#ef4444",
    logo: SITE_NAME,
    heading: "New login detected",
    body: `Hey <strong style="color:#fff">${username}</strong>, we noticed a login from ${info.browser} on ${info.device} (${info.ip}, ${info.country}) at ${info.time}. If this wasn't you, secure your account.`,
    btnLabel: "Secure My Account",
    btnUrl: settingsUrl,
    small: "You can disable these alerts in Settings → Notifications.",
  });
  const text = `New login on ${SITE_NAME}\n\nTime: ${info.time}\nBrowser: ${info.browser}\nDevice: ${info.device}\nIP: ${info.ip}\nCountry: ${info.country}\n\nSecure: ${settingsUrl}\n`;
  return sendMail(email, `New login detected — ${SITE_NAME}`, html, text);
}

const ACTION_LABELS: Record<string, string> = {
  change_password: "Password Change",
  delete_account: "Account Deletion",
  email_change: "Email Change",
};

export async function sendActionConfirmEmail(email: string, username: string, type: "change_password" | "delete_account", token: string) {
  const url = `${process.env.SITE_URL}/auth/confirm-action?token=${token}&type=${type}`;
  const label = ACTION_LABELS[type];
  const isDelete = type === "delete_account";
  const html = baseTemplate({
    accent: isDelete ? "#ff4444" : "#39ff14",
    accent2: isDelete ? "#ff8080" : "#ff1a3c",
    logo: SITE_NAME,
    heading: `Confirm ${label}`,
    body: `Hi ${username}, please confirm this ${label.toLowerCase()} request by clicking the button below.`,
    btnLabel: `Confirm ${label}`,
    btnUrl: url,
    small: "This link expires in 1 hour. If you didn't request this, ignore this email.",
  });
  const text = `Confirm ${label} — ${SITE_NAME}\n\nHi ${username},\n\n${url}\n\nExpires in 1 hour.\n`;
  return sendMail(email, `Confirm ${label} — ${SITE_NAME}`, html, text);
}

export async function sendEmailChangeVerification(email: string, username: string, newEmail: string, token: string) {
  const url = `${process.env.SITE_URL}/auth/confirm-action?token=${token}&type=email_change`;
  const html = baseTemplate({
    accent: "#39ff14",
    accent2: "#ff1a3c",
    logo: SITE_NAME,
    heading: "Confirm your new email",
    body: `Hi ${username}, please confirm changing your ${SITE_NAME} account email to <strong style="color:#fff">${newEmail}</strong> by clicking the button below.`,
    btnLabel: "Confirm Email Change",
    btnUrl: url,
    small: "This link expires in 24 hours. If you didn't request this, ignore this email.",
  });
  const text = `Confirm your new email — ${SITE_NAME}\n\nHi ${username},\n\n${url}\n\nExpires in 24 hours.\n`;
  return sendMail(newEmail, `Confirm your new email — ${SITE_NAME}`, html, text);
}
