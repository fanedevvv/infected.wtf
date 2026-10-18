import nodemailer from "nodemailer";
import { getEmailTemplateByKey, applyTemplateVariables } from "./email-templates";

const SITE_NAME = process.env.SITE_NAME || "INFECTED.WTF";

export function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  const hasAuth = Boolean(process.env.SMTP_USER);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: hasAuth ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    // Local unauthenticated relay (Postfix on this box) presents a cert for
    // its own hostname, not "localhost" — STARTTLS would otherwise fail
    // hostname verification. Same pattern used by game.acsr.ro's mailer.
    ...(hasAuth ? {} : { tls: { rejectUnauthorized: false } }),
  });
}

async function sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
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

/** Fetch an editable DB template by key, fill in {{variables}}, and send it.
 *  `site_name` is always available on top of whatever the caller passes. */
async function sendTemplated(to: string, templateKey: string, variables: Record<string, string>): Promise<boolean> {
  const template = await getEmailTemplateByKey(templateKey);
  if (!template) {
    console.error(`[mail] template not found: ${templateKey}`);
    return false;
  }
  const vars = { site_name: SITE_NAME, ...variables };
  const subject = applyTemplateVariables(template.subject, vars);
  const html = applyTemplateVariables(template.bodyHtml, vars);
  return sendMail(to, subject, html);
}

export async function sendVerificationEmail(email: string, username: string, token: string) {
  const url = `${process.env.SITE_URL}/auth/verify-email?token=${token}`;
  return sendTemplated(email, "verify_account", { username, verify_url: url });
}

export async function sendPasswordResetEmail(email: string, username: string, token: string) {
  const url = `${process.env.SITE_URL}/reset-password?token=${token}`;
  return sendTemplated(email, "reset_password", { username, reset_url: url });
}

export async function sendReloginVerificationEmail(email: string, username: string, token: string) {
  const url = `${process.env.SITE_URL}/auth/confirm-action?token=${token}&type=relogin`;
  return sendTemplated(email, "relogin_verify", { username, confirm_url: url });
}

export async function sendNewLoginEmail(
  email: string,
  username: string,
  info: { time: string; browser: string; device: string; ip: string; country: string }
) {
  const settingsUrl = `${process.env.SITE_URL}/dashboard?page=settings`;
  return sendTemplated(email, "new_login", { username, settings_url: settingsUrl, ...info });
}

const ACTION_TEMPLATE_KEYS: Record<string, string> = {
  change_password: "confirm_password_change",
  delete_account: "confirm_delete_account",
};

export async function sendActionConfirmEmail(email: string, username: string, type: "change_password" | "delete_account", token: string) {
  const url = `${process.env.SITE_URL}/auth/confirm-action?token=${token}&type=${type}`;
  return sendTemplated(email, ACTION_TEMPLATE_KEYS[type], { username, confirm_url: url });
}

export async function sendEmailChangeVerification(email: string, username: string, newEmail: string, token: string) {
  const url = `${process.env.SITE_URL}/auth/confirm-action?token=${token}&type=email_change`;
  return sendTemplated(newEmail, "email_change_verify", { username, new_email: newEmail, confirm_url: url });
}
