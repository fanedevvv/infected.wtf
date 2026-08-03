"use client";

import { useEffect, useState } from "react";
import { onToast, ToastType } from "@/lib/toast";

type ToastItem = { id: number; msg: string; type: ToastType };

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return onToast((msg, type) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, msg, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ color: "#5fefa5", flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ color: "#ff8080", flexShrink: 0 }}><path d="M18 6L6 18M6 6l12 12" /></svg>
          )}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
