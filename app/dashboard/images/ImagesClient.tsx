"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";

type HostedImage = {
  id: number;
  key: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  views: number;
  createdAt: string;
  page: string;
  direct: string;
};

function fmtBytes(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ImagesClient() {
  const t = useT();
  const [images, setImages] = useState<HostedImage[]>([]);
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/images")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setImages(d.images);
        setUsed(d.used);
        setQuota(d.quota);
      })
      .finally(() => setLoading(false));
  }, []);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length || uploading) return;
    setUploading({ done: 0, total: list.length });
    let ok = 0;
    for (const [i, file] of list.entries()) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/images", { method: "POST", body: fd });
        const d = await res.json();
        if (d.success) {
          ok++;
          setImages((prev) => [d.image, ...prev]);
          setUsed((u) => u + d.image.size);
        } else {
          showToast(`${file.name}: ${t(d.error || "Something went wrong.")}`, "error");
        }
      } catch {
        showToast(t("Network error. Please try again."), "error");
      }
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (ok) showToast(t("{n} image(s) uploaded", { n: ok }), "success");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("Link copied!"), "success");
    } catch {
      showToast(t("Couldn't copy — select the link manually."), "error");
    }
  }

  async function remove(img: HostedImage) {
    if (!confirm(t("Delete this image? Links to it will stop working."))) return;
    const res = await fetch("/api/images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: img.id }) });
    const d = await res.json().catch(() => ({}));
    if (d.success) {
      setImages((prev) => prev.filter((x) => x.id !== img.id));
      setUsed((u) => Math.max(0, u - img.size));
    } else {
      showToast(t(d.error || "Something went wrong."), "error");
    }
  }

  const pct = quota ? Math.min(100, (used / quota) * 100) : 0;

  return (
    <div className="ih-page">
      <div className="section-header">
        <h2>{t("Image Host")}</h2>
        <p>{t("Upload images and share them with a short link. Embeds nicely on Discord.")}</p>
      </div>

      <div className="ih-usage dash-card">
        <div className="ih-usage-row">
          <span>{t("Storage")}</span>
          <span><b>{fmtBytes(used)}</b> / {quota ? fmtBytes(quota) : "–"}</span>
        </div>
        <div className="ih-usage-track"><span style={{ width: `${pct}%`, background: pct > 90 ? "#ef4444" : undefined }} /></div>
        <div className="ih-usage-sub">{t("{n} images", { n: images.length })} · {t("PNG, JPG, WEBP or GIF, max 10 MB each. Location data is removed from photos.")}</div>
      </div>

      <div
        className={`ih-drop ${dragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="34" height="34"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
        <b>{uploading ? t("Uploading {done}/{total}…", { done: uploading.done, total: uploading.total }) : t("Drop images here or click to upload")}</b>
        <span>{t("You can select several at once.")}</span>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }} />
      </div>

      {!loading && images.length === 0 && <p className="ih-empty">{t("No images yet.")}</p>}

      <div className="ih-grid">
        {images.map((img) => (
          <div className="ih-card" key={img.id}>
            <a className="ih-thumb" href={img.page} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.direct} alt={img.name} loading="lazy" />
              {img.mime === "image/gif" && <span className="ih-tag">GIF</span>}
            </a>
            <div className="ih-card-body">
              <b title={img.name}>{img.name}</b>
              <span>{fmtBytes(img.size)} · {t("{n} views", { n: img.views })}</span>
            </div>
            <div className="ih-card-actions">
              <button type="button" onClick={() => copy(img.page)}>{t("Copy link")}</button>
              <button type="button" onClick={() => copy(img.direct)}>{t("Direct")}</button>
              <button type="button" className="danger" onClick={() => remove(img)} aria-label={t("Delete")}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
