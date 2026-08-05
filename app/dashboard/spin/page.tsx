import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { SPIN_PRIZES, SPIN_COOLDOWN_MS } from "@/lib/spin";
import SpinClient from "./SpinClient";

export default async function SpinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nextAt = user.lastDailySpinAt ? user.lastDailySpinAt.getTime() + SPIN_COOLDOWN_MS : 0;
  const canSpin = Date.now() >= nextAt;

  return (
    <SpinClient
      tokens={user.tokens}
      prizes={SPIN_PRIZES.map((p) => ({ label: p.label, color: p.color, type: p.type }))}
      canSpin={canSpin}
      nextAt={canSpin ? null : nextAt}
    />
  );
}
