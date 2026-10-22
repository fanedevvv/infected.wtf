"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Comment = {
  id: number;
  parentId: number | null;
  pinned: boolean;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
  canDelete: boolean;
  canPin: boolean;
  isOwn: boolean;
  author: { username: string; slug: string | null; displayName: string; avatar: string | null };
  replies?: Comment[];
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
  const [openReplyId, setOpenReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [openRepliesId, setOpenRepliesId] = useState<Set<number>>(new Set());
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

  async function postReply(parent: Comment) {
    if (!replyText.trim() || replying) return;
    setReplying(true);
    try {
      const res = await fetch("/api/profile-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body: replyText, parentId: parent.id }),
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) => prev.map((c) => (c.id === parent.id ? { ...c, replies: [...(c.replies || []), data.comment] } : c)));
        setOpenRepliesId((prev) => new Set(prev).add(parent.id));
        setReplyText("");
        setOpenReplyId(null);
      }
    } finally {
      setReplying(false);
    }
  }

  async function toggleLike(c: Comment, parentId: number | null) {
    if (!viewerLoggedIn) {
      router.push("/login");
      return;
    }
    const patch = (list: Comment[]): Comment[] =>
      list.map((x) => {
        if (x.id === c.id) return { ...x, likedByViewer: !c.likedByViewer, likeCount: c.likeCount + (c.likedByViewer ? -1 : 1) };
        if (parentId !== null && x.id === parentId) return { ...x, replies: (x.replies || []).map((r) => (r.id === c.id ? { ...r, likedByViewer: !c.likedByViewer, likeCount: c.likeCount + (c.likedByViewer ? -1 : 1) } : r)) };
        return x;
      });
    setComments(patch);
    try {
      const res = await fetch("/api/profile-comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      if (!data.success) setComments((prev) => patch(prev)); // revert by re-toggling
    } catch {
      setComments((prev) => patch(prev));
    }
  }

  async function togglePin(c: Comment) {
    const next = !c.pinned;
    setComments((prev) => prev.map((x) => ({ ...x, pinned: x.id === c.id ? next : false })));
    const res = await fetch("/api/profile-comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, action: next ? "pin" : "unpin" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.success) {
      setLoading(true);
      load(0, sort);
    }
  }

  async function remove(c: Comment, parentId: number | null) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch("/api/profile-comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      if (parentId === null) {
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setComments((prev) => prev.map((x) => (x.id === parentId ? { ...x, replies: (x.replies || []).filter((r) => r.id !== c.id) } : x)));
      }
    }
  }

  function toggleRepliesOpen(id: number) {
    setOpenRepliesId((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderComment(c: Comment, parentId: number | null) {
    const avatar = c.author.avatar ? `/${c.author.avatar}` : "/assets/img/default-avatar.png";
    const nameEl = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pc-avatar" src={avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
        <span className="pc-name">{c.author.displayName}</span>
      </>
    );
    const replyCount = c.replies?.length || 0;
    const repliesOpen = openRepliesId.has(c.id);

    return (
      <article className={`pc-item ${c.pinned ? "pc-item--pinned" : ""} ${parentId !== null ? "pc-item--reply" : ""}`} key={c.id}>
        {c.pinned && (
          <div className="pc-pinned-tag">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M16 3l5 5-5.5 5.5L17 18l-5-5-5 5-1-1 5-5-5-5 1-1 5 5 5-5z" /></svg>
            Pinned
          </div>
        )}
        <div className="pc-item-head">
          {c.author.slug ? <Link href={`/${c.author.slug}`} className="pc-author">{nameEl}</Link> : <span className="pc-author">{nameEl}</span>}
          <span className="pc-time" title={new Date(c.createdAt).toLocaleString()}>{timeAgo(c.createdAt)}</span>
        </div>
        <p className="pc-body">{c.body}</p>
        <div className="pc-actions">
          <button
            type="button"
            className={`pc-like ${c.likedByViewer ? "liked" : ""}`}
            onClick={() => toggleLike(c, parentId)}
            disabled={c.isOwn}
            title={c.isOwn ? "Your comment" : c.likedByViewer ? "Unlike" : "Like"}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill={c.likedByViewer ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {c.likeCount}
          </button>
          {parentId === null && (
            <button type="button" className="pc-reply-btn" onClick={() => { setOpenReplyId(openReplyId === c.id ? null : c.id); setReplyText(""); }}>
              Reply
            </button>
          )}
          {c.canPin && parentId === null && (
            <button type="button" className="pc-pin-btn" onClick={() => togglePin(c)}>
              {c.pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {c.canDelete && (
            <button type="button" className="pc-delete" onClick={() => remove(c, parentId)}>Delete</button>
          )}
        </div>

        {parentId === null && openReplyId === c.id && (
          <div className="pc-reply-form">
            <textarea
              className="pc-input pc-input--reply"
              placeholder={`Reply to ${c.author.displayName}…`}
              value={replyText}
              maxLength={MAX_LENGTH}
              rows={2}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postReply(c); }}
              autoFocus
            />
            <div className="pc-form-row">
              <button type="button" className="pc-cancel" onClick={() => setOpenReplyId(null)}>Cancel</button>
              <button type="button" className="pc-post" disabled={replying || !replyText.trim()} onClick={() => postReply(c)}>
                {replying ? "Posting…" : "Reply"}
              </button>
            </div>
          </div>
        )}

        {parentId === null && replyCount > 0 && (
          <>
            <button type="button" className="pc-show-replies" onClick={() => toggleRepliesOpen(c.id)}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: repliesOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
              {repliesOpen ? "Hide" : "View"} {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
            {repliesOpen && (
              <div className="pc-replies">
                {c.replies!.map((r) => renderComment(r, c.id))}
              </div>
            )}
          </>
        )}
      </article>
    );
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
        {comments.map((c) => renderComment(c, null))}

        {!loading && comments.length === 0 && <p className="pc-empty">No comments yet.</p>}
        {loading && <p className="pc-empty">Loading…</p>}
        {!loading && hasMore && (
          <button type="button" className="pc-more" onClick={() => { setLoading(true); load(comments.length, sort); }}>Load more</button>
        )}
      </div>
    </section>
  );
}
