export const DiscordIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width={size} height={size}>
    <path fill="currentColor" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
  </svg>
);

export const SteamIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
  </svg>
);

export const RobloxIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M4.24 0 0 19.76 19.76 24 24 4.24 4.24 0zm9.55 8.09 2.12 9.62-9.62 2.12L4.17 10.2l9.62-2.11z" />
  </svg>
);

/** Creeper-face pixel icon — a recognizable Minecraft glyph built from a plain rect grid (no trademarked artwork embedded). */
export const MinecraftIcon = ({ size = 20 }: { size?: number }) => {
  const px = 3;
  const dark = "#1c1c1c";
  const face: [number, number][] = [
    // eyes
    [1, 1], [2, 1], [1, 2], [2, 2],
    [5, 1], [6, 1], [5, 2], [6, 2],
    // nose/mouth
    [3, 3], [4, 3],
    [2, 4], [3, 4], [4, 4], [5, 4],
    [2, 5], [5, 5],
    [2, 6], [3, 6], [4, 6], [5, 6],
  ];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect x="0" y="0" width="24" height="24" rx="2" fill="#5cb85c" />
      {face.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={dark} />
      ))}
    </svg>
  );
};

export const ServerIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size}>
    <rect x="2" y="3" width="20" height="7" rx="1" /><rect x="2" y="14" width="20" height="7" rx="1" /><line x1="6" y1="6.5" x2="6" y2="6.5" /><line x1="6" y1="17.5" x2="6" y2="17.5" />
  </svg>
);

export const ValorantIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M23.75 4.24 14.6 15.94a.36.36 0 0 0-.06.32l1.96 6.87a.35.35 0 0 0 .65.06l6.68-18.75a.35.35 0 0 0-.08-.2zM.32 4.5 9.65 15.5a.36.36 0 0 1 .06.32l-2.04 6.9a.35.35 0 0 1-.65.05L.02 4.7a.35.35 0 0 1 .3-.2z" />
  </svg>
);

export const TwitchIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0Zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

export const SpotifyIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);
