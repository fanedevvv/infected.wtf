import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
  BOOST_COST, BOOST_COST_PLUS, BOOST_DAYS, CREW_CREATE_COST, CREW_EMBLEMS, activeBoosts, crewViews, isHexColor, levelFor, memberCap, parseGroupLinks, tagProblem,
} from "@/lib/crews";

const JOIN_POLICIES = ["open", "request", "invite"];

const err = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });
const isPremiumNow = (u: { isPremium: boolean | null; premiumExpiresAt: Date | null }) => !!u.isPremium && (!u.premiumExpiresAt || u.premiumExpiresAt > new Date());
const isStaff = (u: { isMod: boolean; isAdmin: boolean | null; isOwner: boolean | null }) => !!(u.isMod || u.isAdmin || u.isOwner);

async function capacityFor(crewId: number, ownerId: number) {
  const [boosts, owner] = await Promise.all([
    activeBoosts([crewId]).then((b) => b.get(crewId) ?? 0),
    prisma.user.findUnique({ where: { id: ownerId }, select: { isPremium: true, premiumExpiresAt: true } }),
  ]);
  return memberCap(boosts, !!owner && isPremiumNow(owner));
}

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
    const requests = await prisma.crewRequest.findMany({ where: { crewId: c.id }, orderBy: { createdAt: "asc" }, include: { user: { select: { username: true, profiles: { where: { isPrimary: true }, take: 1, select: { displayName: true, avatar: true } } } } } });
    const boosts = (await activeBoosts([c.id])).get(c.id) ?? 0;
    crew = {
      id: c.id, tag: c.tag, name: c.name, description: c.description, color: c.color, emblem: c.emblem, myRole: membership.role,
      icon: c.icon, banner: c.banner, strip: c.strip, joinPolicy: c.joinPolicy, links: parseGroupLinks(c.links), createdAt: c.createdAt.toISOString(),
      boosts, level: levelFor(boosts).level,
      views: (await crewViews([c.id])).get(c.id) ?? 0,
      maxMembers: await capacityFor(c.id, c.ownerId),
      requests: requests.map((r) => ({ id: r.id, username: r.user.username, displayName: r.user.profiles[0]?.displayName || r.user.username, avatar: r.user.profiles[0]?.avatar ?? null })),
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
    boostCost: isPremiumNow(me) ? BOOST_COST_PLUS : BOOST_COST,
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
    if (membership) return err("Leave your current group first.");
    const tag = String(body.tag || "").trim().toUpperCase();
    const problem = tagProblem(tag);
    if (problem) return err(problem);
    const name = String(body.name || "").trim().slice(0, 40);
    if (name.length < 2) return err("Give your group a name (2–40 characters).");
    const color = isHexColor(body.color) ? body.color : "#c6ff3d";
    const emblem = CREW_EMBLEMS[String(body.emblem)] ? String(body.emblem) : "biohazard";
    const description = String(body.description || "").trim().slice(0, 300) || null;
    const cost = isPremiumNow(me) ? 0 : CREW_CREATE_COST;
    if (me.tokens < cost) return err(`Creating a group costs ${cost} tokens (free with Infected Plus).`);
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
    if (membership) return err("Leave your current group first.");
    const max = await capacityFor(invite.crewId, invite.crew.ownerId);
    if ((await prisma.crewMember.count({ where: { crewId: invite.crewId } })) >= max) return err("This group is full.");
    await prisma.$transaction([
      prisma.crewMember.create({ data: { crewId: invite.crewId, userId: me.id, role: "member" } }),
      prisma.crewInvite.deleteMany({ where: { userId: me.id } }),
      prisma.crewRequest.deleteMany({ where: { userId: me.id } }),
    ]);
    await notify(invite.invitedBy, `${me.username} joined [${invite.crew.tag}]`, `@${me.username} accepted your invite to ${invite.crew.name}.`);
    return ok({ message: `Welcome to [${invite.crew.tag}] ${invite.crew.name}!` });
  }

  // ── join an open group / ask to join a request-only one / cancel that request ──
  if (action === "join" || action === "request" || action === "cancel_request") {
    const target = await prisma.crew.findUnique({ where: { tag: String(body.tag || "").toUpperCase() } });
    if (!target) return err("Group not found.");
    if (action === "cancel_request") {
      await prisma.crewRequest.deleteMany({ where: { crewId: target.id, userId: me.id } });
      return ok({ message: "Request cancelled." });
    }
    if (membership) return err(membership.crewId === target.id ? "You're already in this group." : "Leave your current group first.");
    if (target.joinPolicy === "invite") return err("This group is invite-only.");
    const max = await capacityFor(target.id, target.ownerId);
    if ((await prisma.crewMember.count({ where: { crewId: target.id } })) >= max) return err("This group is full.");
    if (target.joinPolicy === "open") {
      await prisma.$transaction([
        prisma.crewMember.create({ data: { crewId: target.id, userId: me.id, role: "member" } }),
        prisma.crewInvite.deleteMany({ where: { userId: me.id } }),
        prisma.crewRequest.deleteMany({ where: { userId: me.id } }),
      ]);
      return ok({ message: `Welcome to ${target.name}!` });
    }
    if (action === "join") return err("This group needs approval — ask to join instead.");
    try {
      await prisma.crewRequest.create({ data: { crewId: target.id, userId: me.id } });
    } catch {
      return err("You already asked to join.");
    }
    const managers = await prisma.crewMember.findMany({ where: { crewId: target.id, role: { in: ["owner", "officer"] } }, select: { userId: true } });
    for (const m of managers) await notify(m.userId, `@${me.username} wants to join ${target.name}`, "Approve or decline the request in your group settings.");
    return ok({ message: "Request sent — you'll be notified when it's answered." });
  }

  // ── boost a group (anyone; one active boost per person per group, renewing extends it) ──
  if (action === "boost") {
    const target = await prisma.crew.findUnique({ where: { tag: String(body.tag || "").toUpperCase() } });
    if (!target) return err("Group not found.");
    const cost = isPremiumNow(me) ? BOOST_COST_PLUS : BOOST_COST;
    if (me.tokens < cost) return err(`A boost costs ${cost} tokens.`);
    const mine = await prisma.crewBoost.findFirst({ where: { crewId: target.id, userId: me.id, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "desc" } });
    const base = mine ? mine.expiresAt : new Date();
    const expiresAt = new Date(base.getTime() + BOOST_DAYS * 86400000);
    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { tokens: { decrement: cost }, tokensSpent: { increment: cost } } }),
      mine
        ? prisma.crewBoost.update({ where: { id: mine.id }, data: { expiresAt } })
        : prisma.crewBoost.create({ data: { crewId: target.id, userId: me.id, expiresAt } }),
    ]);
    if (!mine) await notify(target.ownerId, `${target.name} got a boost!`, `@${me.username} boosted your group.`, `/g/${target.tag}`);
    return ok({ message: mine ? `Boost extended to ${expiresAt.toLocaleDateString("en-GB")}.` : `You boosted ${target.name}!`, expiresAt: expiresAt.toISOString() });
  }

  // ── approve / deny a join request (owner/officer) ──
  if (action === "approve" || action === "deny") {
    if (!membership || (role !== "owner" && role !== "officer")) return err("Forbidden", 403);
    const reqRow = await prisma.crewRequest.findFirst({ where: { id: Number(body.requestId), crewId: membership.crewId } });
    if (!reqRow) return err("Request not found.");
    if (action === "deny") {
      await prisma.crewRequest.delete({ where: { id: reqRow.id } });
      await notify(reqRow.userId, `Request to join ${membership.crew.name}`, "Your request was declined.", `/g/${membership.crew.tag}`);
      return ok({ message: "Request declined." });
    }
    if (await prisma.crewMember.findUnique({ where: { userId: reqRow.userId } })) {
      await prisma.crewRequest.delete({ where: { id: reqRow.id } });
      return err("They already joined another group.");
    }
    const max = await capacityFor(membership.crewId, membership.crew.ownerId);
    if ((await prisma.crewMember.count({ where: { crewId: membership.crewId } })) >= max) return err("The group is full — boost it to raise the limit.");
    await prisma.$transaction([
      prisma.crewMember.create({ data: { crewId: membership.crewId, userId: reqRow.userId, role: "member" } }),
      prisma.crewRequest.deleteMany({ where: { userId: reqRow.userId } }),
      prisma.crewInvite.deleteMany({ where: { userId: reqRow.userId } }),
    ]);
    await notify(reqRow.userId, `Welcome to ${membership.crew.name}!`, "Your request to join was approved.", `/g/${membership.crew.tag}`);
    return ok({ message: "Request approved." });
  }

  // ── staff: disband any crew (moderation) ──
  if (action === "staff_disband") {
    if (!isStaff(me)) return err("Forbidden", 403);
    const crew = await prisma.crew.findUnique({ where: { tag: String(body.tag || "").toUpperCase() } });
    if (!crew) return err("Group not found.");
    const members = await prisma.crewMember.findMany({ where: { crewId: crew.id }, select: { userId: true } });
    await prisma.crew.delete({ where: { id: crew.id } });
    for (const m of members) await notify(m.userId, `[${crew.tag}] was disbanded`, "Staff removed this group for breaking the rules.", "/rules");
    return ok({ message: `[${crew.tag}] disbanded.` });
  }

  if (!membership) return err("You're not in a group.");
  const crew = membership.crew;

  // ── leave ──
  if (action === "leave") {
    if (role === "owner") return err("Hand the group to someone else first, or disband it.");
    await prisma.crewMember.delete({ where: { userId: me.id } });
    return ok({ message: `You left [${crew.tag}].` });
  }

  // ── disband (owner) ──
  if (action === "disband") {
    if (role !== "owner") return err("Only the owner can disband the group.", 403);
    const members = await prisma.crewMember.findMany({ where: { crewId: crew.id, userId: { not: me.id } }, select: { userId: true } });
    await prisma.crew.delete({ where: { id: crew.id } });
    for (const m of members) await notify(m.userId, `[${crew.tag}] was disbanded`, `${crew.name} no longer exists.`);
    return ok({ message: `[${crew.tag}] disbanded.` });
  }

  // ── edit (owner/officer) ──
  if (action === "update") {
    if (!canManage) return err("Only the owner and officers can edit the group.", 403);
    const data: { name?: string; description?: string | null; color?: string; emblem?: string; joinPolicy?: string; links?: string } = {};
    if (JOIN_POLICIES.includes(String(body.joinPolicy))) data.joinPolicy = String(body.joinPolicy);
    if (Array.isArray(body.links)) {
      const cleaned = body.links.map((l: { label?: unknown; url?: unknown }) => ({ label: String(l?.label || "").trim().slice(0, 30), url: String(l?.url || "").trim().slice(0, 300) }));
      data.links = JSON.stringify(parseGroupLinks(JSON.stringify(cleaned)));
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 40);
      if (name.length < 2) return err("The name must be 2–40 characters.");
      data.name = name;
    }
    if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 300) || null;
    if (isHexColor(body.color)) data.color = body.color;
    if (body.emblem !== undefined && CREW_EMBLEMS[String(body.emblem)]) data.emblem = String(body.emblem);
    await prisma.crew.update({ where: { id: crew.id }, data });
    return ok({ message: "Group updated." });
  }

  // ── invite by username (owner/officer) ──
  if (action === "invite") {
    if (!canManage) return err("Only the owner and officers can invite.", 403);
    const username = String(body.username || "").trim().replace(/^@/, "");
    const target = await prisma.user.findFirst({ where: { username }, select: { id: true, username: true, banned: true } });
    if (!target || target.banned) return err("No user with that username.");
    if (target.id === me.id) return err("You're already in the group.");
    if (await prisma.crewMember.findUnique({ where: { userId: target.id } })) return err(`@${target.username} is already in a group.`);
    const existing = await prisma.crewInvite.findUnique({ where: { crewId_userId: { crewId: crew.id, userId: target.id } } });
    if (existing) return err("Already invited.");
    if ((await prisma.crewInvite.count({ where: { crewId: crew.id } })) >= 20) return err("Too many pending invites — wait for some to be answered.");
    await prisma.crewInvite.create({ data: { crewId: crew.id, userId: target.id, invitedBy: me.id } });
    await notify(target.id, `Invite to [${crew.tag}] ${crew.name}`, `@${me.username} invited you to join their group.`);
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
    if (role !== "owner") return err("Only the owner can hand over the group.", 403);
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
