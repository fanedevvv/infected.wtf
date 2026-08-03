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
    const record = await prisma.passwordReset.findUnique({ where: { tokenHash }, include: { user: { select: { username: true } } } });
    if (!record) {
      status = "invalid";
    } else if (record.expiresAt < new Date()) {
      await prisma.passwordReset.delete({ where: { id: record.id } });
      status = "expired";
    } else {
      status = "form";
      username = record.user.username;
    }
  }

  return <ResetPasswordForm token={rawToken} initialStatus={status} username={username} />;
}
