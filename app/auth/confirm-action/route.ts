import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session";
import { encryptEmail, decryptEmail, emailBlindIndex } from "@/lib/crypto";

const ALLOWED_TYPES = ["email_change", "change_password", "delete_account", "relogin"];

export async function GET(req: NextRequest) {
  const siteUrl = process.env.SITE_URL || "";
  const token = req.nextUrl.searchParams.get("token") || "";
  const type = req.nextUrl.searchParams.get("type") || "";

  let status: "invalid" | "expired" | "success" | "already" = "invalid";
  let newEmail = "";
  let loginUserId: number | null = null;
  let destroySessionFlag = false;

  if (token && ALLOWED_TYPES.includes(type)) {
    if (type === "email_change") {
      const row = await prisma.emailChangePending.findFirst({ where: { token, expiresAt: { gt: new Date() } } });
      if (!row) {
        const usedChk = await prisma.emailChangePending.findFirst({ where: { token } });
        status = usedChk ? "already" : "invalid";
      } else {
        const plainNewEmail = decryptEmail(row.newEmail);
        await prisma.$transaction([
          prisma.user.update({
            where: { id: row.userId },
            data: { email: encryptEmail(plainNewEmail), emailBlindIndex: emailBlindIndex(plainNewEmail), emailVerified: true },
          }),
          prisma.emailChangePending.deleteMany({ where: { userId: row.userId } }),
        ]);
        status = "success";
        newEmail = plainNewEmail;
        loginUserId = row.userId;
      }
    } else {
      const row = await prisma.actionConfirmation.findFirst({
        where: { token, actionType: type, expiresAt: { gt: new Date() }, used: false },
      });
      if (!row) {
        const usedChk = await prisma.actionConfirmation.findFirst({ where: { token, used: true } });
        status = usedChk ? "already" : "invalid";
      } else {
        await prisma.actionConfirmation.update({ where: { id: row.id }, data: { used: true, usedAt: new Date() } });

        if (type === "change_password") {
          await prisma.user.update({ where: { id: row.userId }, data: { password: row.payload || "" } });
          status = "success";
        } else if (type === "delete_account") {
          await prisma.user.delete({ where: { id: row.userId } });
          status = "success";
          destroySessionFlag = true;
        } else if (type === "relogin") {
          await prisma.user.update({ where: { id: row.userId }, data: { lastLogin: new Date() } });
          status = "success";
          loginUserId = row.userId;
        }
      }
    }
  }

  const url = new URL(`${siteUrl}/auth/confirm-action/result`);
  url.searchParams.set("status", status);
  url.searchParams.set("type", type);
  if (newEmail) url.searchParams.set("email", newEmail);

  const res = NextResponse.redirect(url.toString());
  if (loginUserId) {
    const cookie = buildSessionCookie(loginUserId);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  if (destroySessionFlag) {
    res.cookies.delete(SESSION_COOKIE_NAME);
  }
  return res;
}
