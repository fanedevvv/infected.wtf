"use client";

import { useEffect, useState } from "react";

type ProfileData = {
  displayName: string | null;
  bio: string | null;
  location: string | null;
  accentColor: string;
  secondaryColor: string;
  backgroundType: string;
  backgroundValue: string;
  avatar?: string | null;
};

export default function ProfileInfoPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
    const data = await res.json();
    if (res.ok) setProfile({ ...profile, avatar: data.avatar });
    setUploading(false);
  }

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) return <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full text-white/50">Loading…</main>;

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Customize profile</h1>
      <form onSubmit={handleSave} className="gf-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar || "/uploads/avatars/default.png"}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover bg-white/5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <label className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer">
            {uploading ? "Uploading…" : "Change avatar"}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Display name</label>
          <input
            className="gf-input"
            value={profile.displayName ?? ""}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Bio</label>
          <textarea
            className="gf-input"
            rows={3}
            maxLength={300}
            value={profile.bio ?? ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Location</label>
          <input
            className="gf-input"
            value={profile.location ?? ""}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Accent color</label>
            <input
              type="color"
              className="h-10 w-full rounded-lg bg-transparent"
              value={profile.accentColor}
              onChange={(e) => setProfile({ ...profile, accentColor: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Secondary color</label>
            <input
              type="color"
              className="h-10 w-full rounded-lg bg-transparent"
              value={profile.secondaryColor}
              onChange={(e) => setProfile({ ...profile, secondaryColor: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Background type</label>
          <select
            className="gf-input"
            value={profile.backgroundType}
            onChange={(e) => setProfile({ ...profile, backgroundType: e.target.value })}
          >
            <option value="particles">Particles</option>
            <option value="color">Solid color</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image URL</option>
            <option value="video">Video URL</option>
          </select>
        </div>
        {profile.backgroundType !== "particles" && (
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Background value</label>
            <input
              className="gf-input"
              value={profile.backgroundValue}
              onChange={(e) => setProfile({ ...profile, backgroundValue: e.target.value })}
              placeholder={profile.backgroundType === "color" ? "#050507" : "https://…"}
            />
          </div>
        )}

        <button type="submit" disabled={saving} className="gf-btn w-full">
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
