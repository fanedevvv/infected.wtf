import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { imageLinks } from "@/lib/image-host";
import CopyButton from "./CopyButton";

async function load(key: string) {
  const img = await prisma.hostedImage.findUnique({
    where: { key },
    include: { user: { select: { username: true, banned: true, profiles: { where: { isPrimary: true }, select: { slug: true, avatar: true, displayName: true, accentColor: true }, take: 1 } } } },
  });
  return img && !img.user.banned ? img : null;
}

function fmtSize(bytes: number) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Discord/Twitter embeds show the image itself as a large card.
export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const img = await load((await params).key);
  if (!img) return { title: "Image not found | INFECTED.WTF" };
  const { direct, page } = imageLinks(img);
  const by = img.user.profiles[0]?.displayName || img.user.username;
  return {
    title: `${img.name} | INFECTED.WTF`,
    description: `Uploaded by @${img.user.username} · ${fmtSize(img.size)}`,
    openGraph: {
      title: img.name,
      description: `Uploaded by ${by}`,
      url: page,
      siteName: "INFECTED.WTF",
      images: [{ url: direct, width: img.width ?? undefined, height: img.height ?? undefined, type: img.mime }],
    },
    twitter: { card: "summary_large_image", title: img.name, images: [direct] },
    robots: { index: false },
  };
}

export default async function ImagePage({ params }: { params: Promise<{ key: string }> }) {
  const img = await load((await params).key);
  if (!img) notFound();
  await prisma.hostedImage.update({ where: { id: img.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const { direct, page } = imageLinks(img);
  const profile = img.user.profiles[0];

  return (
    <main className="ih-view">
      <div className="ih-view-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/${img.path}`} alt={img.name} width={img.width ?? undefined} height={img.height ?? undefined} />
      </div>
      <div className="ih-view-bar">
        <div className="ih-view-meta">
          <b title={img.name}>{img.name}</b>
          <span>
            {img.width && img.height ? `${img.width}×${img.height} · ` : ""}{fmtSize(img.size)} · {img.views + 1} views ·{" "}
            {img.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="ih-view-actions">
          <CopyButton text={page} label="Copy link" />
          <CopyButton text={direct} label="Copy direct" />
          <a className="ih-btn" href={`/${img.path}`} download={img.name}>Download</a>
        </div>
      </div>
      {profile && (
        <a className="ih-view-owner" href={`/${profile.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.avatar ? `/${profile.avatar}` : "/assets/img/default-avatar.png"} alt="" />
          Uploaded by <b>{profile.displayName || img.user.username}</b>
        </a>
      )}
      <Link className="ih-view-home" href="/">Hosted on INFECTED.WTF</Link>
    </main>
  );
}
