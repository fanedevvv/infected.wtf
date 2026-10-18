import Link from "next/link";

export default function BackHome() {
  return (
    <Link href="/" className="back-home">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
      Back to home
    </Link>
  );
}
