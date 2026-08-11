"use client";

// Original decorative avatar-frame artwork, drawn as inline SVG (no external assets).

function Halo() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <ellipse cx="50" cy="10" rx="22" ry="6" fill="none" stroke="#ffd700" strokeWidth="3.5" opacity="0.95">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="50" cy="10" rx="22" ry="6" fill="none" stroke="#ffd700" strokeWidth="8" opacity="0.25" />
    </svg>
  );
}

function Laurel() {
  const leaf = (side: number) => (
    <g>
      {[...Array(6)].map((_, i) => {
        const y = 30 + i * 9;
        const x = 50 + side * (14 + i * 1.6);
        return <ellipse key={i} cx={x} cy={y} rx="6" ry="3" fill="#8bc34a" opacity="0.9" transform={`rotate(${side * (30 + i * 4)} ${x} ${y})`} />;
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {leaf(-1)}
      {leaf(1)}
    </svg>
  );
}

function Stars() {
  const pts = [
    [50, 4], [88, 30], [92, 68], [50, 96], [8, 68], [12, 30],
  ];
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {pts.map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <path d="M0,-4 L1.2,-1.2 4,0 1.2,1.2 0,4 -1.2,1.2 -4,0 -1.2,-1.2 Z" fill="#fde047">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
          </path>
        </g>
      ))}
    </svg>
  );
}

function Hearts() {
  const pts = [[15, 20, 0.9], [85, 25, 1.1], [10, 70, 1], [90, 68, 0.8], [50, 6, 0.7]] as const;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {pts.map(([x, y, s], i) => (
        <path
          key={i}
          d="M0,3 C-4,-2 -10,-1 -10,4 C-10,9 -3,13 0,16 C3,13 10,9 10,4 C10,-1 4,-2 0,3 Z"
          fill="#fb7185"
          opacity="0.9"
          transform={`translate(${x},${y}) scale(${s * 0.55})`}
        >
          <animateTransform attributeName="transform" type="translate" additive="sum" values="0,0; 0,-3; 0,0" dur="2.4s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  );
}

function Bubbles() {
  const pts = [[12, 80, 5], [22, 55, 3.5], [85, 78, 6], [78, 50, 4], [50, 92, 3]] as const;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#7dd3fc" strokeWidth="1.4" opacity="0.85">
          <animate attributeName="cy" values={`${y};${y - 12};${y}`} dur="3.5s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

function Thorns() {
  const n = 14;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#3f2d1f" strokeWidth="3" opacity="0.8" />
      {[...Array(n)].map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 47, y1 = 50 + Math.sin(a) * 47;
        const x2 = 50 + Math.cos(a) * 56, y2 = 50 + Math.sin(a) * 56;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5b3a29" strokeWidth="2.2" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function Frost() {
  const n = 8;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#7dd3fc" strokeWidth="2" opacity="0.5" />
      {[...Array(n)].map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 47, y = 50 + Math.sin(a) * 47;
        return (
          <path key={i} d="M0,-6 L0,6 M-5,-3 L5,3 M-5,3 L5,-3" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" transform={`translate(${x},${y}) rotate(${(a * 180) / Math.PI})`} />
        );
      })}
    </svg>
  );
}

function Flame() {
  const n = 16;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {[...Array(n)].map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 48, y = 50 + Math.sin(a) * 48;
        return (
          <path key={i} d="M0,0 C-3,-6 -1,-11 0,-14 C1,-11 3,-6 0,0 Z" fill="#ff6a00" opacity="0.9" transform={`translate(${x},${y}) rotate(${(a * 180) / Math.PI + 90})`}>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="0.9s" begin={`${i * 0.06}s`} repeatCount="indefinite" />
          </path>
        );
      })}
    </svg>
  );
}

function Storm() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#facc15" strokeWidth="1.5" opacity="0.35" />
      {[0, 90, 180, 270].map((deg, i) => (
        <path key={i} d="M50,3 L45,20 L52,20 L46,38" fill="none" stroke="#facc15" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" transform={`rotate(${deg} 50 50)`} opacity="0.9">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  );
}

function WingsAngel() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <path d="M46,50 C30,40 8,42 2,58 C14,54 24,56 34,64 C24,62 14,66 6,74 C18,72 28,74 38,80 C40,68 44,58 46,50 Z" fill="#f5f5f5" opacity="0.95" />
      <path d="M54,50 C70,40 92,42 98,58 C86,54 76,56 66,64 C76,62 86,66 94,74 C82,72 72,74 62,80 C60,68 56,58 54,50 Z" fill="#f5f5f5" opacity="0.95" />
    </svg>
  );
}

function WingsDemon() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <path d="M46,50 C28,38 6,44 0,62 L10,58 L8,68 L18,62 L16,74 L34,64 C38,68 44,58 46,50 Z" fill="#3b0f0f" stroke="#7f1d1d" strokeWidth="1" opacity="0.95" />
      <path d="M54,50 C72,38 94,44 100,62 L90,58 L92,68 L82,62 L84,74 L66,64 C62,68 56,58 54,50 Z" fill="#3b0f0f" stroke="#7f1d1d" strokeWidth="1" opacity="0.95" />
    </svg>
  );
}

function CrownGold() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <g transform="translate(50,10)">
        <path d="M-22,10 L-22,-2 L-11,6 L0,-10 L11,6 L22,-2 L22,10 Z" fill="#ffd700" stroke="#b8860b" strokeWidth="1" />
        <circle cx="0" cy="-10" r="2.4" fill="#ef4444" />
        <circle cx="-11" cy="6" r="1.8" fill="#3b82f6" />
        <circle cx="11" cy="6" r="1.8" fill="#3b82f6" />
      </g>
    </svg>
  );
}

function Rainbow() {
  const colors = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {colors.map((c, i) => (
        <circle key={c} cx="50" cy="50" r={49 - i * 2.4} fill="none" stroke={c} strokeWidth="1.6" opacity="0.85" strokeDasharray="10 6">
          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur={`${8 + i}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

function GalaxyRing() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <defs>
        <radialGradient id="gxy" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
          <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#312e81" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#gxy)" strokeWidth="6">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="14s" repeatCount="indefinite" />
      </circle>
      {[...Array(10)].map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 48} cy={50 + Math.sin(a) * 48} r="1.4" fill="#fff" opacity="0.9" />;
      })}
    </svg>
  );
}

function Phoenix() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <path d="M46,50 C24,34 -2,38 2,66 C16,56 26,58 36,68 C24,64 12,70 6,84 C24,82 36,84 44,92 C42,76 44,60 46,50 Z" fill="#ff5722" opacity="0.95" />
      <path d="M54,50 C76,34 102,38 98,66 C84,56 74,58 64,68 C76,64 88,70 94,84 C76,82 64,84 56,92 C58,76 56,60 54,50 Z" fill="#ff9800" opacity="0.95" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#ffca28" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

function CatEars() {
  const ear = (side: number) => (
    <g transform={`translate(${50 + side * 20},14) rotate(${side * 12})`}>
      <path d="M0,-16 L-11,10 L11,10 Z" fill="#4b5563" stroke="#1f2937" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M0,-9 L-6,7 L6,7 Z" fill="#f9a8d4" />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {ear(-1)}
      {ear(1)}
    </svg>
  );
}

function BunnyEars() {
  const ear = (side: number) => (
    <g transform={`translate(${50 + side * 12},-2) rotate(${side * 6})`}>
      <ellipse cx="0" cy="0" rx="7" ry="24" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.2" />
      <ellipse cx="0" cy="1" rx="3.4" ry="18" fill="#f9a8d4" />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {ear(-1)}
      {ear(1)}
    </svg>
  );
}

function Clover() {
  const pts: [number, number, number][] = [[14, 30, 1], [88, 24, 0.85], [8, 74, 0.9], [90, 72, 1], [50, 4, 0.8]];
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {pts.map(([x, y, s]) => (
        <g key={`${x}-${y}`} transform={`translate(${x},${y}) scale(${s})`}>
          {[0, 90, 180, 270].map((deg) => (
            <ellipse key={deg} cx="0" cy={-4} rx="3.4" ry="4.2" fill="#4ade80" opacity="0.92" transform={`rotate(${deg})`} />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Pumpkin() {
  const n = 6;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {[...Array(n)].map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 46, y = 50 + Math.sin(a) * 46;
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <ellipse cx="0" cy="0" rx="6" ry="5.2" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
            <path d="M-1.5,-1.5 L1.5,-1.5 L0,1.5 Z" fill="#3f1d0a" />
            <rect x="-1" y="-7.5" width="2" height="3" fill="#65a30d" />
            <animate attributeName="opacity" values="0.75;1;0.75" dur="2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
          </g>
        );
      })}
    </svg>
  );
}

function Snowfall() {
  const pts = [[10, 15, 0.8], [80, 10, 1], [92, 55, 0.7], [15, 65, 1], [55, 88, 0.85], [45, 8, 0.6]] as const;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {pts.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
          <path d="M0,-6 L0,6 M-5.2,-3 L5.2,3 M-5.2,3 L5.2,-3" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
          <animateTransform attributeName="transform" type="translate" additive="sum" values="0,0; 0,4; 0,0" dur="3s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
        </g>
      ))}
    </svg>
  );
}

function Lanterns() {
  const pts = [[10, 22], [90, 18], [6, 66], [94, 62]] as const;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {pts.map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <line x1="0" y1="-8" x2="0" y2="-4" stroke="#facc15" strokeWidth="1" />
          <rect x="-4.5" y="-4" width="9" height="12" rx="4" fill="#dc2626" stroke="#991b1b" strokeWidth="0.8" />
          <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#fbbf24" strokeWidth="0.6" />
          <line x1="-4.5" y1="4" x2="4.5" y2="4" stroke="#fbbf24" strokeWidth="0.6" />
          <animateTransform attributeName="transform" type="translate" additive="sum" values="0,0; 0,-2; 0,0" dur="2.4s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
        </g>
      ))}
    </svg>
  );
}

function Vinyl() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <g transform="translate(50,50)">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" additive="sum" />
        <circle r="47" fill="#111827" />
        <circle r="38" fill="none" stroke="#374151" strokeWidth="1" />
        <circle r="29" fill="none" stroke="#374151" strokeWidth="1" />
        <circle r="20" fill="none" stroke="#374151" strokeWidth="1" />
        <circle r="9" fill="#dc2626" />
        <circle r="2.4" fill="#111827" />
      </g>
    </svg>
  );
}

function PixelRing() {
  const n = 20;
  const colors = ["#39ff14", "#22d3ee", "#f472b6", "#facc15"];
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg" shapeRendering="crispEdges">
      {[...Array(n)].map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 46, y = 50 + Math.sin(a) * 46;
        return <rect key={i} x={x - 3} y={y - 3} width="6" height="6" fill={colors[i % colors.length]} />;
      })}
    </svg>
  );
}

function DiamondRing() {
  const n = 10;
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      {[...Array(n)].map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 47, y = 50 + Math.sin(a) * 47;
        return (
          <path key={i} d="M0,-5 L4,0 L0,5 L-4,0 Z" fill="#a5f3fc" stroke="#22d3ee" strokeWidth="0.6" transform={`translate(${x},${y})`}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </path>
        );
      })}
    </svg>
  );
}

function Unicorn() {
  const strands = ["#f9a8d4", "#c4b5fd", "#93c5fd", "#86efac", "#fde68a"];
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <path d="M50,4 L45,22 L55,22 Z" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
      {strands.map((c, i) => (
        <path key={c} d={`M${34 + i * 2},18 C${20 - i * 3},30 ${18 - i * 2},50 ${26},68`} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
          <animate attributeName="opacity" values="0.5;0.95;0.5" dur="2.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  );
}

function WolfSpirit() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <g opacity="0.9">
        <path d="M78,60 L94,40 L86,54 L98,44 L88,60 C92,66 90,76 80,78 C84,70 80,64 74,64 Z" fill="#dbeafe" opacity="0.85" />
        <circle cx="82" cy="58" r="1.6" fill="#1d4ed8" />
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur="3s" repeatCount="indefinite" />
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function DragonWings() {
  return (
    <svg viewBox="0 0 100 100" className="decoration-svg">
      <path d="M46,52 C26,44 4,50 0,64 L8,60 L6,68 L16,63 L14,72 L28,66 C24,72 22,80 24,88 C34,82 42,68 46,52 Z" fill="#166534" stroke="#14532d" strokeWidth="1" opacity="0.95" />
      <path d="M54,52 C74,44 96,50 100,64 L92,60 L94,68 L84,63 L86,72 L72,66 C76,72 78,80 76,88 C66,82 58,68 54,52 Z" fill="#15803d" stroke="#14532d" strokeWidth="1" opacity="0.95" />
    </svg>
  );
}

export const DECORATION_SVGS: Record<string, () => React.ReactElement> = {
  halo: Halo,
  laurel: Laurel,
  stars: Stars,
  hearts: Hearts,
  bubbles: Bubbles,
  thorns: Thorns,
  frost: Frost,
  flame: Flame,
  storm: Storm,
  wings_angel: WingsAngel,
  wings_demon: WingsDemon,
  crown_gold: CrownGold,
  rainbow: Rainbow,
  galaxy_ring: GalaxyRing,
  phoenix: Phoenix,
  cat_ears: CatEars,
  bunny_ears: BunnyEars,
  clover: Clover,
  pumpkin: Pumpkin,
  snowfall: Snowfall,
  lanterns: Lanterns,
  vinyl: Vinyl,
  pixel_ring: PixelRing,
  diamond_ring: DiamondRing,
  unicorn: Unicorn,
  wolf_spirit: WolfSpirit,
  dragon_wings: DragonWings,
};

function legacyDecorationSrc(id: string): string | null {
  const m = id.match(/^custom_(\d+)(?:\.(png|webp|jpe?g|gif))?$/i);
  if (!m) return null;
  const ext = (m[2] || "png").toLowerCase();
  return `/assets/img/decorations/custom_${m[1]}.${ext}`;
}

export function DecorationFrame({ id }: { id: string | null | undefined }) {
  if (!id) return null;
  const legacySrc = legacyDecorationSrc(id);
  if (legacySrc) {
    return (
      <div className="decoration-frame" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={legacySrc}
          alt=""
          className="decoration-raster"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }
  const Comp = DECORATION_SVGS[id];
  if (!Comp) return null;
  return (
    <div className="decoration-frame" aria-hidden="true">
      <Comp />
    </div>
  );
}
