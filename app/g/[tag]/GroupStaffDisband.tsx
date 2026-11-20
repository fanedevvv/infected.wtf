"use client";

import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

/** Staff-only moderation: disband a crew that breaks the rules. */
export default function GroupStaffDisband({ tag }: { tag: string }) {
  const router = useRouter();
  return (
    <div className="crew-staff">
      <span>Staff</span>
      <button
        type="button"
        onClick={async () => {
          if (!confirm(`Disband [${tag}] for breaking the rules? Members are notified.`)) return;
          const res = await fetch("/api/crews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "staff_disband", tag }) });
          const j = await res.json().catch(() => ({}));
          if (j.success) { showToast(j.message, "success"); router.push("/groups"); } else showToast(j.error || "Error", "error");
        }}
      >
        Disband group
      </button>
    </div>
  );
}
