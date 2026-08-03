"use client";

export default function LogoutLink({ className }: { className?: string }) {
  return (
    <a
      href="#"
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      ← Log out
    </a>
  );
}
