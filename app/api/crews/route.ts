import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
  CREW_CREATE_COST, CREW_EMBLEMS, CREW_MAX_MEMBERS, CREW_MAX_MEMBERS_PLUS, crewViews, isHexColor, tagProblem,
} from "@/lib/crews";

const err = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });
const isPremiumNow = (u: { isPremium: boolean | null; premiumExpiresAt: Date | null }) => !!u.isPremium && (!u.premiumExpiresAt || u.premiumExpiresAt > new Date());
const isStaff = (u: { isMod: boolean; isAdmin: boolean | null; isOwner: boolean | null }) => !!(u.isMod || u.isAdmin || u.isOwner);

async function notify(userId: number, title: string, body: string, link = "/dashboard?page=crew") {
  await prisma.notification.create({ data: { userId, type: "crew", title, body, icon: "users", link } }).catch(() => {});
}

/** My crew (with members) + my pending invites. */
export async function GET() {
  let me;
  try { me = await requireUser(); } catch { return err("Unauthorized", 401); }
  const membership = await prisma.crewMember.findUnique({ where: { userId: me.id }, include: { crew: true } });
  const invites = await prisma.crewInvite.findMany({
    where: { userId: me.id }, orderBy: { createdAt: "desc" },
    include: { crew: { select: { id: true, tag: true, name: true, color: true, emblem: true, _count: { select: { members: true } } } } },
  });
  let crew = null;
  if (membership) {
    const c = membership.crew;
    const members = await prisma.crewMember.findMany({ where: { crewId: c.id }, orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, username: true, profiles: { where: { isPrimary: true }, take: 1, select: { slug: true, displayName: true, avatar: true, views: true } } } } } });
    const pending = await prisma.crewInvite.findMany({ where: { crewId: c.id }, include: { user: { select: { username: true } } } });
    const owner = await prisma.user.findUnique({ where: { id: c.ownerId }, select: { isPremium: true, premiumExpiresAt: true } });
    crew = {
      id: c.id, tag: c.tag, name: c.name, description: c.description, color: c.color, emblem: c.emblem, myRole: membership.role,
      views: (await crewViews([c.id])).get(c.id) ?? 0,
      maxMembers: owner && isPremiumNow(owner) ? CREW_MAX_MEMBERS_PLUS : CREW_MAX_MEMBERS,
      members: members.map((m) => ({
        userId: m.userId, role: m.role, username: m.user.username,
        slug: m.user.profiles[0]?.slug ?? null, displayName: m.user.profiles[0]?.displayName || m.user.username,
        avatar: m.user.profiles[0]?.avatar ?? null, views: m.user.profiles[0]?.views ?? 0,
      })),
      pendingInvites: pending.map((p) => ({ id: p.id, username: p.user.username })),
    };
  }
  return ok({
    crew,
    invites: invites.map((i) => ({ id: i.id, crew: { tag: i.crew.tag, name: i.crew.name, color: i.crew.color, emblem: i.crew.emblem, members: i.crew._count.members } })),
    createCost: isPremiumNow(me) ? 0 : CREW_CREATE_COST,
  });
}

export async function POST(req: NextRequest) {
  let me;
  try { me = await requireUser(); } catch { return err("Unauthorized", 401); }
  if (me.banned) return err("Your account has been suspended.", 403);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const membership = await prisma.crewMember.findUnique({ where: { userId: me.id }, include: { crew: true } });
  const role = membership?.role;
  const canManage = role === "owner" || role === "officer";

  // ── create ──
  if (action === "create") {
    if (membership) return err("Leave your current crew first.");
    const tag = String(body.tag || "").trim().toUpperCase();
    const problem = tagProblem(tag);
    if (problem) return err(problem);
    const name = String(body.name || "").trim().slice(0, 40);
    if (name.length < 2) return err("Give your crew a name (2–40 characters).");
    const color = isHexColor(body.color) ? body.color : "#c6ff3d";
    const emblem = CREW_EMBLEMS[String(body.emblem)] ? String(body.emblem) : "biohazard";
    const description = String(body.description || "").trim().slice(0, 300) || null;
    const cost = isPremiumNow(me) ? 0 : CREW_CREATE_COST;
    if (me.tokens < cost) return err(`Creating a crew costs ${cost} tokens (free with Infected Plus).`);
    if (await prisma.crew.findUnique({ where: { tag } })) return err("That tag is already taken.");
    try {
      const crew = await prisma.$transaction(async (tx) => {
        if (cost) await tx.user.update({ where: { id: me.id }, data: { tokens: { decrement: cost }, tokensSpent: { increment: cost } } });
        const c = await tx.crew.create({ data: { tag, name, color, emblem, description, ownerId: me.id } });
        await tx.crewMember.create({ data: { crewId: c.id, userId: me.id, role: "owner" } });
        await tx.crewInvite.deleteMany({ where: { userId: me.id } });
        return c;
      });
      return ok({ message: `[${crew.tag}] ${crew.name} is live!`, tag: crew.tag });
    } catch {
      return err("That tag was just taken — try another.");
    }
  }

  // ── accept / decline an invite ──
  if (action === "accept" || action === "decline") {
    const invite = await prisma.crewInvite.findFirst({ where: { id: Number(body.inviteId), userId: me.id }, include: { crew: true } });
    if (!invite) return err("Invite not found.");
    if (action === "decline") {
      await prisma.crewInvite.delete({ where: { id: invite.id } });
      return ok({ message: "Invite declined." });
    }
    if (membership) return err("Leave your current crew first.");
    const owner = await prisma.user.findUnique({ where: { id: invite.crew.ownerId }, select: { isPremium: true, premiumExpiresAt: true } });
    const max = owner && isPremiumNow(owner) ? CREW_MAX_MEMBERS_PLUS : CREW_MAX_MEMBERS;
    if ((await prisma.crewMember.count({ where: { crewId: invite.crewId } })) >= max) return err("This crew is full.");
    await prisma.$transaction([
      prisma.crewMember.create({ data: { crewId: invite.crewId, userId: me.id, role: "member" } }),
      prisma.crewInvite.deleteMany({ where: { userId: me.id } }),
    ]);
    await notify(invite.invitedBy, `${me.username} joined [${invite.crew.tag}]`, `@${me.username} accepted your invite to ${invite.crew.name}.`);
    return ok({ message: `Welcome to [${invite.crew.tag}] ${invite.crew.name}!` });
  }

  // ── staff: disband any crew (moderation) ──
  if (action === "staff_disband") {
    if (!isStaff(me)) return err("Forbidden", 403);
    const crew = await prisma.crew.findUnique({ where: { tag: String(body.tag || "").toUpperCase() } });
    if (!crew) return err("Crew not found.");
    const members = await prisma.crewMember.findMany({ where: { crewId: crew.id }, select: { userId: true } });
    await prisma.crew.delete({ where: { id: crew.id } });
    for (const m of members) await notify(m.userId, `[${crew.tag}] was disbanded`, "Staff removed this crew for breaking the rules.", "/rules");
    return ok({ message: `[${crew.tag}] disbanded.` });
  }

  if (!membership) return err("You're not in a crew.");
  const crew = membership.crew;

  // ── leave ──
  if (action === "leave") {
    if (role === "owner") return err("Hand the crew to someone else first, or disband it.");
    await prisma.crewMember.delete({ where: { userId: me.id } });
    return ok({ message: `You left [${crew.tag}].` });
  }

  // ── disband (owner) ──
  if (action === "disband") {
    if (role !== "owner") return err("Only the owner can disband the crew.", 403);
    const members = await prisma.crewMember.findMany({ where: { crewId: crew.id, userId: { not: me.id } }, select: { userId: true } });
    await prisma.crew.delete({ where: { id: crew.id } });
    for (const m of members) await notify(m.userId, `[${crew.tag}] was disbanded`, `${crew.name} no longer exists.`);
    return ok({ message: `[${crew.tag}] disbanded.` });
  }

  // ── edit (owner/officer) ──
  if (action === "update") {
    if (!canManage) return err("Only the owner and officers can edit the crew.", 403);
    const data: { name?: string; description?: string | null; color?: string; emblem?: string } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 40);
      if (name.length < 2) return err("The name must be 2–40 characters.");
      data.name = name;
    }
    if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 300) || null;
    if (isHexColor(body.color)) data.color = body.color;
    if (body.emblem !== undefined && CREW_EMBLEMS[String(body.emblem)]) data.emblem = String(body.emblem);
    await prisma.crew.update({ where: { id: crew.id }, data });
    return ok({ message: "Crew updated." });
  }

  // ── invite by username (owner/officer) ──
  if (action === "invite") {
    if (!canManage) return err("Only the owner and officers can invite.", 403);
    const username = String(body.username || "").trim().replace(/^@/, "");
    const target = await prisma.user.findFirst({ where: { username }, select: { id: true, username: true, banned: true } });
    if (!target || target.banned) return err("No user with that username.");
    if (target.id === me.id) return err("You're already in the crew.");
    if (await prisma.crewMember.findUnique({ where: { userId: target.id } })) return err(`@${target.username} is already in a crew.`);
    const existing = await prisma.crewInvite.findUnique({ where: { crewId_userId: { crewId: crew.id, userId: target.id } } });
    if (existing) return err("Already invited.");
    if ((await prisma.crewInvite.count({ where: { crewId: crew.id } })) >= 20) return err("Too many pending invites — wait for some to be answered.");
    await prisma.crewInvite.create({ data: { crewId: crew.id, userId: target.id, invitedBy: me.id } });
    await notify(target.id, `Invite to [${crew.tag}] ${crew.name}`, `@${me.username} invited you to join their crew.`);
    return ok({ message: `Invite sent to @${target.username}.` });
  }

  if (action === "cancel_invite") {
    if (!canManage) return err("Forbidden", 403);
    await prisma.crewInvite.deleteMany({ where: { id: Number(body.inviteId), crewId: crew.id } });
    return ok({ message: "Invite cancelled." });
  }

  // ── member management ──
  const targetId = Number(body.userId);
  const target = Number.isInteger(targetId) ? await prisma.crewMember.findFirst({ where: { crewId: crew.id, userId: targetId } }) : null;
  if (!target) return err("Member not found.");
  if (target.userId === me.id) return err("You can't do that to yourself.");

  if (action === "kick") {
    if (!canManage) return err("Forbidden", 403);
    if (target.role === "owner" || (role === "officer" && target.role === "officer")) return err("You can't remove this member.", 403);
    await prisma.crewMember.delete({ where: { id: target.id } });
    await notify(target.userId, `Removed from [${crew.tag}]`, `You were removed from ${crew.name}.`);
    return ok({ message: "Member removed." });
  }
  if (action === "promote" || action === "demote") {
    if (role !== "owner") return err("Only the owner can change roles.", 403);
    await prisma.crewMember.update({ where: { id: target.id }, data: { role: action === "promote" ? "officer" : "member" } });
    return ok({ message: action === "promote" ? "Promoted to officer." : "Set back to member." });
  }
  if (action === "transfer") {
    if (role !== "owner") return err("Only the owner can hand over the crew.", 403);
    await prisma.$transaction([
      prisma.crew.update({ where: { id: crew.id }, data: { ownerId: target.userId } }),
      prisma.crewMember.update({ where: { id: target.id }, data: { role: "owner" } }),
      prisma.crewMember.update({ where: { userId: me.id }, data: { role: "officer" } }),
    ]);
    await notify(target.userId, `You now own [${crew.tag}]`, `@${me.username} handed ${crew.name} over to you.`);
    return ok({ message: "Ownership transferred." });
  }

  return err("Unknown action.");
}
