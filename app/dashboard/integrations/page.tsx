"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Integration = {
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
  discordUserId: string;
} | null;

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [integration, setIntegration] = useState<Integration>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/integrations/discord");
    const data = await res.json();
    setIntegration(data.integration);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function disconnect() {
    await fetch("/api/integrations/discord", { method: "DELETE" });
    load();
  }

  const error = searchParams.get("error");
  const connected = searchParams.get("connected");

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Integrations</h1>

      {connected && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Discord connected!
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error === "already_linked"
            ? "That Discord account is already linked to another user."
            : "Something went wrong connecting Discord."}
        </div>
      )}

      <div className="gf-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2] font-bold">
            D
          </div>
          <div>
            <div className="font-semibold text-sm">Discord</div>
            {loading ? (
              <div className="text-white/40 text-xs">Loading…</div>
            ) : integration ? (
              <div className="text-white/50 text-xs">
                Connected as {integration.discordGlobalName || integration.discordUsername}
              </div>
            ) : (
              <div className="text-white/40 text-xs">Not connected</div>
            )}
          </div>
        </div>
        {!loading &&
          (integration ? (
            <button onClick={disconnect} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">
              Disconnect
            </button>
          ) : (
            <a href="/api/integrations/discord/connect" className="gf-btn text-xs">
              Connect
            </a>
          ))}
      </div>
    </main>
  );
}
