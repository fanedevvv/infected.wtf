import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { LINK_ICON_DIR, removeLinkIconFile } from "@/lib/link-icons";

// SVG is left out on purpose: uploads are served from our own origin, where an SVG can run scripts.
const EXTS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;
const DIR = path.join(process.cwd(), "public", LINK_ICON_DIR);

async function ownedLink(id: string) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  const link = await prisma.socialLink.findUnique({ where: { id: Number(id) } });
  if (!link || link.userId !== user.id) return { error: NextResponse.json({ success: false, error: "Not found" }, { status: 404 }) };
  return { user, link };
}

/** Upload a custom logo for one link. Infected Plus only. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await ownedLink(id);
  if (res.error) return res.error;
  const { user, link } = res;

  const isPremium = !!(user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date()));
  if (!isPremium) return NextResponse.json({ success: false, error: "Custom link logos are an Infected Plus feature." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("icon");
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "No image uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: "Max 2MB." }, { status: 400 });
  const ext = EXTS[file.type];
  if (!ext) return NextResponse.json({ success: false, error: "Unsupported type. We accept PNG, JPG, GIF, WebP." }, { status: 400 });

  const fname = `li_${user.id}_${link.id}_${Date.now()}.${ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, fname), Buffer.from(await file.arrayBuffer()));
  const relPath = `${LINK_ICON_DIR}/${fname}`;

  await prisma.socialLink.update({ where: { id: link.id }, data: { iconUrl: relPath } });
  await removeLinkIconFile(link.iconUrl);
  return NextResponse.json({ success: true, iconUrl: relPath });
}

/** Go back to the platform icon. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await ownedLink(id);
  if (res.error) return res.error;
  const { link } = res;

  await prisma.socialLink.update({ where: { id: link.id }, data: { iconUrl: null } });
  await removeLinkIconFile(link.iconUrl);
  return NextResponse.json({ success: true });
}
