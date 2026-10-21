import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { sha256 } from "@/lib/crypto";
import { REPORT_REASONS } from "@/lib/report-reasons";

const MAX_REPORTS_PER_HOUR = 5;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || "0.0.0.0";
}

async function notifyStaff(report: { id: number; reason: string; details: string | null }, slug: string, reporter: string) {
  const webhookUrl = process.env.DISCORD_ADMIN_LOG_WEBHOOK;
  if (!webhookUrl) return;
  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: "⚑ Profile Reported",
        url: `${siteUrl}/${slug}`,
        color: 16753920,
        fields: [
          { name: "🎯 Profile", value: `[@${slug}](${siteUrl}/${slug})`, inline: true },
          { name: "📌 Reason", value: REPORT_REASONS[report.reason] || report.reason, inline: true },
          { name: "👤 Reported by", value: reporter, inline: true },
          ...(report.details ? [{ name: "📝 Details", value: report.details.slice(0, 1000), inline: false }] : []),
          { name: "⏰ When", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        ],
        footer: { text: `Report #${report.id} · review it in the admin panel` },
      }],
    }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}

// Anyone can report a profile (logged in or not); limited per IP and one open report per reporter per profile.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  const reason = String(body.reason || "");
  const details = String(body.details || "").trim().slice(0, 1000) || null;
  if (!REPORT_REASONS[reason]) return NextResponse.json({ success: false, error: "Pick a reason." }, { status: 400 });

  const profile = await prisma.profile.findUnique({ where: { slug }, select: { id: true, slug: true, userId: true } });
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });

  const me = await getCurrentUser();
  if (me?.id === profile.userId) return NextResponse.json({ success: false, error: "You can't report your own profile." }, { status: 400 });

  const ipHash = sha256(clientIp(req));
  const recent = await prisma.profileReport.count({ where: { ipHash, createdAt: { gt: new Date(Date.now() - 3600 * 1000) } } });
  if (recent >= MAX_REPORTS_PER_HOUR) return NextResponse.json({ success: false, error: "Too many reports — please try again later." }, { status: 429 });

  const duplicate = await prisma.profileReport.findFirst({
    where: { profileId: profile.id, status: "open", OR: [{ ipHash }, ...(me ? [{ reporterId: me.id }] : [])] },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ success: true, alreadyReported: true });

  const report = await prisma.profileReport.create({
    data: { profileId: profile.id, reporterId: me?.id ?? null, ipHash, reason, details },
  });
  await notifyStaff(report, profile.slug, me ? `\`@${me.username}\`` : "Guest");

  return NextResponse.json({ success: true });
}
