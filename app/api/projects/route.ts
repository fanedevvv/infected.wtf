import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";

const MAX_PENDING = 5;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "projects");

function cleanUrl(raw: FormDataEntryValue | null): string | null | false {
  const v = String(raw || "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 300) : false;
  } catch {
    return false;
  }
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const projects = await prisma.profileProject.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    success: true,
    maxPending: MAX_PENDING,
    projects: projects.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), reviewedAt: p.reviewedAt?.toISOString() ?? null })),
  });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  if (me.banned) return NextResponse.json({ success: false, error: "Your account is suspended." }, { status: 403 });
  const profileId = await getActiveProfileId(me.id);

  const form = await req.formData();
  const title = String(form.get("title") || "").trim().slice(0, 80);
  const description = String(form.get("description") || "").trim().slice(0, 1000) || null;
  const url = cleanUrl(form.get("url"));
  const repoUrl = cleanUrl(form.get("repoUrl"));
  const technologies = String(form.get("technologies") || "")
    .split(",").map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 10);

  if (!title) return NextResponse.json({ success: false, error: "Give your project a title." }, { status: 400 });
  if (url === false || repoUrl === false) return NextResponse.json({ success: false, error: "Links must start with http:// or https://" }, { status: 400 });

  const pending = await prisma.profileProject.count({ where: { profileId, status: "pending" } });
  if (pending >= MAX_PENDING) return NextResponse.json({ success: false, error: `You already have ${MAX_PENDING} projects waiting for review.` }, { status: 400 });

  let image: string | null = null;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ success: false, error: "Image must be JPG, PNG or WEBP." }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ success: false, error: "Image is larger than 2 MB." }, { status: 400 });
    try {
      // Re-encode so only a clean, size-capped WEBP ever lands on disk.
      const webp = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(1200, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      await mkdir(UPLOAD_DIR, { recursive: true });
      const name = `pr_${me.id}_${Date.now()}.webp`;
      await writeFile(path.join(UPLOAD_DIR, name), webp);
      image = `uploads/projects/${name}`;
    } catch {
      return NextResponse.json({ success: false, error: "That image couldn't be read." }, { status: 400 });
    }
  }

  const project = await prisma.profileProject.create({
    data: { profileId, title, description, url, repoUrl, technologies: technologies.join(", ") || null, image },
  });
  return NextResponse.json({ success: true, id: project.id });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const project = Number.isNaN(id) ? null : await prisma.profileProject.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
  if (!project || project.profile.userId !== me.id) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });

  await prisma.profileProject.delete({ where: { id } });
  if (project.image) await unlink(path.join(process.cwd(), "public", project.image)).catch(() => {});
  return NextResponse.json({ success: true });
}
