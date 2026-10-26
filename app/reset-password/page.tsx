import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sha256 } from "@/lib/crypto";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const rawToken = (params.token || "").trim();

  let status: "form" | "invalid" | "expired" = "invalid";
  let username = "";

  if (rawToken) {
    const tokenHash = sha256(rawToken);
    const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!record) {
      status = "invalid";
    } else if (record.expiresAt < new Date()) {
      await prisma.passwordReset.delete({ where: { id: record.id } });
      status = "expired";
    } else {
      // password_resets has no Prisma relation to users, so look the owner up directly
      const owner = await prisma.user.findUnique({ where: { id: record.userId }, select: { username: true } });
      if (owner) {
        status = "form";
        username = owner.username;
      }
    }
  }

  return <ResetPasswordForm token={rawToken} initialStatus={status} username={username} />;
}
