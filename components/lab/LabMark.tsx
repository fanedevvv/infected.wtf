// The infected.wtf mark: a nucleus with eight spikes. Draws in currentColor so it follows the accent.
export function LabMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" fill="none">
        <path d="M16 3v6M16 23v6M3 16h6M23 16h6M6.8 6.8l4.3 4.3M20.9 20.9l4.3 4.3M25.2 6.8l-4.3 4.3M11.1 20.9l-4.3 4.3" />
      </g>
      <circle cx="16" cy="16" r="5.6" fill="currentColor" />
    </svg>
  );
}

export function LabWordmark({ className }: { className?: string }) {
  return (
    <span className={`lab-wordmark ${className ?? ""}`}>
      <LabMark size={20} className="lab-wordmark-mark" />
      <span className="lab-wordmark-text">INFECTED<span>.wtf</span></span>
    </span>
  );
}
