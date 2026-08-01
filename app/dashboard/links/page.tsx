"use client";

import { useEffect, useState } from "react";

type Link = { id: number; platform: string; url: string; displayOrder: number };

const PLATFORMS = ["website", "steam", "spotify", "discord", "instagram", "twitter", "youtube", "twitch", "github", "tiktok"];

export default function LinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [platform, setPlatform] = useState("website");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/links");
    const data = await res.json();
    setLinks(data.links || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, url }),
    });
    setUrl("");
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Social links</h1>

      <form onSubmit={handleAdd} className="gf-card p-4 flex gap-2 mb-6">
        <select className="gf-input w-40" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="gf-input flex-1"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className="gf-btn shrink-0">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-white/40 text-sm">No links yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className="gf-card p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-white/40 uppercase">{l.platform}</div>
                <div className="text-sm truncate max-w-xs">{l.url}</div>
              </div>
              <button onClick={() => handleDelete(l.id)} className="text-red-400 text-xs hover:text-red-300">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
