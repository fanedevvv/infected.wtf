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

type EmailTone = "accent" | "alert";

// "Strain lab" palette, inlined: email clients don't support CSS variables.
const EMAIL_TONES: Record<EmailTone, { color: string; ink: string }> = {
  accent: { color: "#c6ff3d", ink: "#0b0c09" },
  alert: { color: "#ff5b1f", ink: "#0b0c09" },
};

/** Same base layout every transactional email uses — kept here only to build
 *  the seed defaults below; the live, editable copy lives in the DB. */
function baseTemplate(opts: {
  tone: EmailTone;
  logo: string;
  heading: string;
  body: string;
  btnLabel: string;
  btnUrl: string;
  small: string;
}) {
  const { color, ink } = EMAIL_TONES[opts.tone];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#0b0c09;font-family:Helvetica,Arial,sans-serif;color:#e7ebdb}
  .wrap{max-width:520px;margin:40px auto;padding:0 16px}
  .card{background:#10120d;border:1px solid rgba(230,238,210,.16)}
  .top-bar{height:4px;background:${color}}
  .body{padding:36px 34px}
  .logo{font-family:'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:.18em;color:#e7ebdb;margin-bottom:30px;text-transform:uppercase}
  .logo span{color:${color}}
  h1{font-family:'Arial Narrow','Helvetica Neue',Arial,sans-serif;font-size:30px;line-height:1;font-weight:800;letter-spacing:.01em;text-transform:uppercase;margin:0 0 14px;color:#e7ebdb}
  p{font-size:14px;line-height:1.7;color:rgba(231,235,219,.62);margin:0 0 26px}
  .btn{display:inline-block;background:${color};color:${ink}!important;font-family:'Courier New',monospace;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding:15px 28px;text-decoration:none}
  .divider{height:1px;background:rgba(230,238,210,.1);margin:28px 0}
  .small{font-size:12px;color:rgba(231,235,219,.4);line-height:1.6}
  .small a{color:${color};text-decoration:none}
  .footer{border-top:1px dashed rgba(230,238,210,.18);padding:16px 34px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(231,235,219,.35)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo"><span>&#9632;</span> ${opts.logo}</div>
    <h1>${opts.heading}</h1>
    <p>${opts.body}</p>
    <a href="${opts.btnUrl}" class="btn">${opts.btnLabel}</a>
    <div class="divider"></div>
    <p class="small">${opts.small}</p>
  </div>
  <div class="footer">&copy; ${opts.logo} &middot; All rights reserved</div>
</div></div></body></html>`;
}

/** Templates whose layout predates the redesign (purple glass card). */
const LEGACY_LAYOUT_MARK = "linear-gradient(160deg,#0a0a16,#0d0d20)";
const ALERT_TEMPLATES = new Set(["new_login", "confirm_delete_account"]);

/** Re-renders a pre-redesign template in the current layout, keeping every
 *  piece of copy (including owner edits). Returns null if it can't be parsed. */
function upgradeLegacyLayout(templateKey: string, html: string): string | null {
  if (!html.includes(LEGACY_LAYOUT_MARK)) return null;
  const pick = (re: RegExp) => html.match(re)?.[1];
  const logo = pick(/<div class="logo">([\s\S]*?)<\/div>/);
  const heading = pick(/<h1>([\s\S]*?)<\/h1>/);
  const body = pick(/<\/h1>\s*<p>([\s\S]*?)<\/p>/);
  const btn = html.match(/<a href="([^"]*)" class="btn">([\s\S]*?)<\/a>/);
  const small = pick(/<p class="small">([\s\S]*?)<\/p>/);
  if (logo == null || heading == null || body == null || !btn || small == null) return null;
  return baseTemplate({
    tone: ALERT_TEMPLATES.has(templateKey) ? "alert" : "accent",
    logo, heading, body: body.replaceAll("color:#fff\"", "color:#e7ebdb\""), btnLabel: btn[2], btnUrl: btn[1], small,
  });
}

/** Defaults the DB is seeded with on first use, with {{variables}} in place of the dynamic bits. */
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
      tone: "accent",
      logo: "{{site_name}}",
      heading: "Verify your email address",
      body: `Hey <strong style="color:#e7ebdb">{{username}}</strong>, you're one step away! Click the button below to verify your email and activate your account.`,
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
      tone: "accent",
      logo: "{{site_name}}",
      heading: "Reset your password",
      body: `Hey <strong style="color:#e7ebdb">{{username}}</strong>, click the button below to choose a new password.`,
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
      tone: "accent",
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
      tone: "alert",
      logo: "{{site_name}}",
      heading: "New login detected",
      body: `Hey <strong style="color:#e7ebdb">{{username}}</strong>, we noticed a login from {{browser}} on {{device}} ({{ip}}, {{country}}) at {{time}}. If this wasn't you, secure your account.`,
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
      tone: "accent",
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
      tone: "alert",
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
      tone: "accent",
      logo: "{{site_name}}",
      heading: "Confirm your new email",
      body: `Hi {{username}}, please confirm changing your {{site_name}} account email to <strong style="color:#e7ebdb">{{new_email}}</strong> by clicking the button below.`,
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

let legacyUpgrade: Promise<void> | null = null;

/** Moves stored templates still on the pre-redesign layout to the current one, once per process. */
function upgradeLegacyTemplates(): Promise<void> {
  legacyUpgrade ??= (async () => {
    const rows = await prisma.emailTemplate.findMany({ select: { id: true, templateKey: true, bodyHtml: true } });
    for (const row of rows) {
      const upgraded = upgradeLegacyLayout(row.templateKey, row.bodyHtml);
      if (upgraded) await prisma.emailTemplate.update({ where: { id: row.id }, data: { bodyHtml: upgraded } });
    }
  })().catch(() => { legacyUpgrade = null; });
  return legacyUpgrade;
}

export async function getAllEmailTemplates(): Promise<EmailTemplateRecord[]> {
  await ensureEmailTemplatesSeeded();
  await upgradeLegacyTemplates();
  const rows = await prisma.emailTemplate.findMany({ orderBy: { templateKey: "asc" } });
  return rows.map(mapRow);
}

export async function getEmailTemplateById(id: number): Promise<EmailTemplateRecord | null> {
  const row = await prisma.emailTemplate.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function getEmailTemplateByKey(templateKey: string): Promise<EmailTemplateRecord | null> {
  await upgradeLegacyTemplates();
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
