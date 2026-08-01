import Link from "next/link";
import NotificationsDropdown from "@/components/NotificationsDropdown";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase">
          GETFAME.WTF
        </Link>
        <NotificationsDropdown />
      </header>
      {children}
    </div>
  );
}
