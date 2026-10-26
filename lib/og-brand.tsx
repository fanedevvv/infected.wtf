// The infected.wtf mark for next/og images. Satori can't resolve currentColor, so the colour is passed in.
export const OG_ACCENT = "#c6ff3d";
export const OG_BG = "#0b0c09";
export const OG_INK = "#e7ebdb";

export function OgMark({ size, color = OG_ACCENT }: { size: number; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <path
        d="M16 3v6M16 23v6M3 16h6M23 16h6M6.8 6.8l4.3 4.3M20.9 20.9l4.3 4.3M25.2 6.8l-4.3 4.3M11.1 20.9l-4.3 4.3"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="square"
        fill="none"
      />
      <circle cx="16" cy="16" r="5.6" fill={color} />
    </svg>
  );
}
