import { prisma } from "./prisma";
import { parseStringArray, serializeStringArray } from "./json-array";

export type EmailTemplateRecord = {
  id: number;
  templateKey: string;
  subject: string;
  bodyHtml: string;
  availableVariables: string[];
  createdAt: Date;
  updatedAt: Date;
};

/** Same base layout every transactional email uses — kept here only to build
 *  the seed defaults below; the live, editable copy lives in the DB. */
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

/** Defaults the DB is seeded with on first use — this is exactly what the
 *  hardcoded templates used to render, just with {{variables}} in place of
 *  the dynamic bits, so switching to DB-backed templates changes nothing
 *  visually until an owner actually edits one in /admin. */
export const EMAIL_TEMPLATE_SEED: Array<{
  templateKey: string;
  subject: string;
  bodyHtml: string;
  availableVariables: string[];
}> = [
  {
    templateKey: "verify_account",
    subject: "Verify your email — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#7c3aed",
      accent2: "#1e40af",
      logo: "{{site_name}}",
      heading: "Verify your email address",
      body: `Hey <strong style="color:#fff">{{username}}</strong>, you're one step away! Click the button below to verify your email and activate your account.`,
      btnLabel: "Verify My Email",
      btnUrl: "{{verify_url}}",
      small: `This link expires in 24 hours. If you didn't create an account on {{site_name}}, you can safely ignore this email.`,
    }),
    availableVariables: ["site_name", "username", "verify_url"],
  },
  {
    templateKey: "reset_password",
    subject: "Reset your password — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#34d399",
      accent2: "#059669",
      logo: "{{site_name}}",
      heading: "Reset your password",
      body: `Hey <strong style="color:#fff">{{username}}</strong>, click the button below to choose a new password.`,
      btnLabel: "Reset Password",
      btnUrl: "{{reset_url}}",
      small: "This link expires in 1 hour. If you didn't request this, ignore this email.",
    }),
    availableVariables: ["site_name", "username", "reset_url"],
  },
  {
    templateKey: "relogin_verify",
    subject: "Confirm it's you — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#7c3aed",
      accent2: "#1e40af",
      logo: "{{site_name}}",
      heading: "Welcome back, {{username}}!",
      body: `It's been a while since you last logged in to {{site_name}}. For your security, please confirm it's you by clicking the button below.`,
      btnLabel: "Yes, It's Me — Continue",
      btnUrl: "{{confirm_url}}",
      small: "This link expires in 1 hour. If you didn't try to log in, change your password immediately.",
    }),
    availableVariables: ["site_name", "username", "confirm_url"],
  },
  {
    templateKey: "new_login",
    subject: "New login detected — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#f59e0b",
      accent2: "#ef4444",
      logo: "{{site_name}}",
      heading: "New login detected",
      body: `Hey <strong style="color:#fff">{{username}}</strong>, we noticed a login from {{browser}} on {{device}} ({{ip}}, {{country}}) at {{time}}. If this wasn't you, secure your account.`,
      btnLabel: "Secure My Account",
      btnUrl: "{{settings_url}}",
      small: "You can disable these alerts in Settings → Notifications.",
    }),
    availableVariables: ["site_name", "username", "time", "browser", "device", "ip", "country", "settings_url"],
  },
  {
    templateKey: "confirm_password_change",
    subject: "Confirm Password Change — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#7c3aed",
      accent2: "#1e40af",
      logo: "{{site_name}}",
      heading: "Confirm Password Change",
      body: `Hi {{username}}, please confirm this password change request by clicking the button below.`,
      btnLabel: "Confirm Password Change",
      btnUrl: "{{confirm_url}}",
      small: "This link expires in 1 hour. If you didn't request this, ignore this email.",
    }),
    availableVariables: ["site_name", "username", "confirm_url"],
  },
  {
    templateKey: "confirm_delete_account",
    subject: "Confirm Account Deletion — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#ff4444",
      accent2: "#ff8080",
      logo: "{{site_name}}",
      heading: "Confirm Account Deletion",
      body: `Hi {{username}}, please confirm this account deletion request by clicking the button below.`,
      btnLabel: "Confirm Account Deletion",
      btnUrl: "{{confirm_url}}",
      small: "This link expires in 1 hour. If you didn't request this, ignore this email.",
    }),
    availableVariables: ["site_name", "username", "confirm_url"],
  },
  {
    templateKey: "email_change_verify",
    subject: "Confirm your new email — {{site_name}}",
    bodyHtml: baseTemplate({
      accent: "#7c3aed",
      accent2: "#1e40af",
      logo: "{{site_name}}",
      heading: "Confirm your new email",
      body: `Hi {{username}}, please confirm changing your {{site_name}} account email to <strong style="color:#fff">{{new_email}}</strong> by clicking the button below.`,
      btnLabel: "Confirm Email Change",
      btnUrl: "{{confirm_url}}",
      small: "This link expires in 24 hours. If you didn't request this, ignore this email.",
    }),
    availableVariables: ["site_name", "username", "new_email", "confirm_url"],
  },
];

function mapRow(row: {
  id: number;
  templateKey: string;
  subject: string;
  bodyHtml: string;
  availableVariables: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EmailTemplateRecord {
  return {
    id: row.id,
    templateKey: row.templateKey,
    subject: row.subject,
    bodyHtml: row.bodyHtml,
    availableVariables: parseStringArray(row.availableVariables),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Populate any seed templates missing from the DB — safe to call anytime,
 *  existing rows (and any edits an owner already made) are left untouched. */
export async function ensureEmailTemplatesSeeded(): Promise<void> {
  const existing = await prisma.emailTemplate.findMany({ select: { templateKey: true } });
  const have = new Set(existing.map((r) => r.templateKey));
  const missing = EMAIL_TEMPLATE_SEED.filter((t) => !have.has(t.templateKey));
  if (missing.length === 0) return;
  await prisma.emailTemplate.createMany({
    data: missing.map((t) => ({
      templateKey: t.templateKey,
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      availableVariables: serializeStringArray(t.availableVariables),
    })),
  });
}

export async function getAllEmailTemplates(): Promise<EmailTemplateRecord[]> {
  await ensureEmailTemplatesSeeded();
  const rows = await prisma.emailTemplate.findMany({ orderBy: { templateKey: "asc" } });
  return rows.map(mapRow);
}

export async function getEmailTemplateById(id: number): Promise<EmailTemplateRecord | null> {
  const row = await prisma.emailTemplate.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function getEmailTemplateByKey(templateKey: string): Promise<EmailTemplateRecord | null> {
  let row = await prisma.emailTemplate.findUnique({ where: { templateKey } });
  if (!row) {
    // Lazily seed on first real send too, in case nobody opened /admin yet.
    await ensureEmailTemplatesSeeded();
    row = await prisma.emailTemplate.findUnique({ where: { templateKey } });
  }
  return row ? mapRow(row) : null;
}

export async function updateEmailTemplate(
  id: number,
  payload: { subject: string; bodyHtml: string }
): Promise<EmailTemplateRecord | null> {
  const row = await prisma.emailTemplate.update({
    where: { id },
    data: { subject: payload.subject, bodyHtml: payload.bodyHtml },
  }).catch(() => null);
  return row ? mapRow(row) : null;
}

/** {{var}} substitution — unmatched variables are left as-is rather than
 *  silently becoming blank, so a typo in the editor is easy to spot. */
export function applyTemplateVariables(content: string, variables: Record<string, string | number | null | undefined>): string {
  let rendered = content;
  for (const [key, rawValue] of Object.entries(variables)) {
    const value = rawValue == null ? "" : String(rawValue);
    const token = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    rendered = rendered.replace(token, value);
  }
  return rendered;
}
