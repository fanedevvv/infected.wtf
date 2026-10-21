"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Comment = {
  id: number;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
  canDelete: boolean;
  isOwn: boolean;
  author: { username: string; slug: string | null; displayName: string; avatar: string | null };
};

type Sort = "newest" | "oldest" | "top";

const SORT_LABELS: Record<Sort, string> = { newest: "Newest first", oldest: "Oldest first", top: "Most liked" };
const MAX_LENGTH = 500;

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfileComments({ slug, viewerLoggedIn }: { slug: string; viewerLoggedIn: boolean }) {
  const [sort, setSort] = useState<Sort>("newest");
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Callers flip `loading` on before calling, so the effect below never sets state synchronously.
  const load = useCallback(async (offset: number, sortBy: Sort) => {
    try {
      const res = await fetch(`/api/profile-comments?slug=${encodeURIComponent(slug)}&sort=${sortBy}&offset=${offset}`);
      const data = await res.json();
      if (data.success) {
        setComments((prev) => (offset === 0 ? data.comments : [...prev, ...data.comments]));
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load(0, sort);
  }, [load, sort]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/profile-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body: text }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setText("");
      setTotal((t) => t + 1);
      if (sort === "newest") setComments((prev) => [data.comment, ...prev]);
      else {
        setLoading(true);
        load(0, sort);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(c: Comment) {
    if (!viewerLoggedIn) {
      router.push("/login");
      return;
    }
    const optimistic = { liked: !c.likedByViewer, count: c.likeCount + (c.likedByViewer ? -1 : 1) };
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, likedByViewer: optimistic.liked, likeCount: optimistic.count } : x)));
    try {
      const res = await fetch("/api/profile-comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      const next = data.success ? { likedByViewer: data.liked, likeCount: data.likeCount } : { likedByViewer: c.likedByViewer, likeCount: c.likeCount };
      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...next } : x)));
    } catch {
      setComments((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    }
  }

  async function remove(c: Comment) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch("/api/profile-comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      setTotal((t) => Math.max(0, t - 1));
    }
  }

  return (
    <section className="pc-section" id="comments">
      <div className="pc-head">
        <h2>
          Comments <span className="pc-count">{total.toLocaleString()}</span>
        </h2>
        <select className="pc-sort" value={sort} onChange={(e) => { setLoading(true); setSort(e.target.value as Sort); }} aria-label="Sort comments">
          {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
            <option key={s} value={s}>{SORT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {viewerLoggedIn ? (
        <form className="pc-form" onSubmit={post}>
          <textarea
            className="pc-input"
            placeholder="Leave a comment…"
            value={text}
            maxLength={MAX_LENGTH}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post(e);
            }}
          />
          <div className="pc-form-row">
            <span className={`pc-chars ${text.length > MAX_LENGTH - 50 ? "warn" : ""}`}>{text.length}/{MAX_LENGTH}</span>
            {error && <span className="pc-error">{error}</span>}
            <button type="submit" className="pc-post" disabled={posting || !text.trim()}>
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <Link href="/login" className="pc-login">Log in to leave a comment</Link>
      )}

      <div className="pc-list">
        {comments.map((c) => {
          const avatar = c.author.avatar ? `/${c.author.avatar}` : "/assets/img/default-avatar.png";
          const nameEl = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pc-avatar" src={avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
              <span className="pc-name">{c.author.displayName}</span>
            </>
          );
          return (
            <article className="pc-item" key={c.id}>
              <div className="pc-item-head">
                {c.author.slug ? <Link href={`/${c.author.slug}`} className="pc-author">{nameEl}</Link> : <span className="pc-author">{nameEl}</span>}
                <span className="pc-time" title={new Date(c.createdAt).toLocaleString()}>{timeAgo(c.createdAt)}</span>
              </div>
              <p className="pc-body">{c.body}</p>
              <div className="pc-actions">
                <button
                  type="button"
                  className={`pc-like ${c.likedByViewer ? "liked" : ""}`}
                  onClick={() => toggleLike(c)}
                  disabled={c.isOwn}
                  title={c.isOwn ? "Your comment" : c.likedByViewer ? "Unlike" : "Like"}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill={c.likedByViewer ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {c.likeCount}
                </button>
                {c.canDelete && (
                  <button type="button" className="pc-delete" onClick={() => remove(c)}>Delete</button>
                )}
              </div>
            </article>
          );
        })}

        {!loading && comments.length === 0 && <p className="pc-empty">No comments yet.</p>}
        {loading && <p className="pc-empty">Loading…</p>}
        {!loading && hasMore && (
          <button type="button" className="pc-more" onClick={() => { setLoading(true); load(comments.length, sort); }}>Load more</button>
        )}
      </div>
    </section>
  );
}
