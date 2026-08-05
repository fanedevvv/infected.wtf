export type SpinPrize =
  | { type: "tokens"; amount: number; label: string; weight: number; color: string }
  | { type: "premium_days"; amount: number; label: string; weight: number; color: string }
  | { type: "badge"; id: "verified"; label: string; weight: number; color: string };

export const SPIN_PRIZES: SpinPrize[] = [
  { type: "tokens", amount: 10, label: "10 Tokens", weight: 30, color: "#9ca3af" },
  { type: "tokens", amount: 25, label: "25 Tokens", weight: 25, color: "#60a5fa" },
  { type: "tokens", amount: 50, label: "50 Tokens", weight: 18, color: "#34d399" },
  { type: "tokens", amount: 100, label: "100 Tokens", weight: 12, color: "#a78bfa" },
  { type: "premium_days", amount: 1, label: "1 Day Premium", weight: 8, color: "#fbbf24" },
  { type: "tokens", amount: 250, label: "250 Tokens", weight: 4, color: "#f97316" },
  { type: "premium_days", amount: 3, label: "3 Days Premium", weight: 2, color: "#facc15" },
  { type: "badge", id: "verified", label: "Verified Badge", weight: 1, color: "#34d399" },
];

export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function rollSpinPrize(): { prize: SpinPrize; index: number } {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    r -= SPIN_PRIZES[i].weight;
    if (r <= 0) return { prize: SPIN_PRIZES[i], index: i };
  }
  return { prize: SPIN_PRIZES[SPIN_PRIZES.length - 1], index: SPIN_PRIZES.length - 1 };
}
