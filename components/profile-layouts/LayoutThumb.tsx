import type { LayoutId } from "@/lib/profile-layouts";

// Miniature sketches of each layout for the editor's picker.
export default function LayoutThumb({ id }: { id: LayoutId | "freemode" }) {
  const lines = (n: number, cls = "lt-line") => Array.from({ length: n }, (_, i) => <i key={i} className={cls} />);
  switch (id) {
    case "freemode":
      return <div className="lt lt-free">{Array.from({ length: 6 }, (_, i) => <i key={i} className="lt-chip" />)}</div>;
    case "modern":
      return <div className="lt lt-modern"><div className="lt-box"><i className="lt-dot" /><div>{lines(2)}</div><div className="lt-cols">{lines(4, "lt-block")}</div></div></div>;
    case "classic":
      return <div className="lt lt-classic"><div className="lt-box"><i className="lt-dot" />{lines(3)}</div></div>;
    case "split":
      return <div className="lt lt-split"><div className="lt-box"><i className="lt-dot" />{lines(3)}</div><div className="lt-list">{Array.from({ length: 4 }, (_, i) => <span key={i}><i className="lt-pip" /><i className="lt-line" /></span>)}</div></div>;
    case "dock":
      return <div className="lt lt-dock"><i className="lt-dot" />{lines(2)}<div className="lt-dockbar">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div></div>;
    case "deck":
      return <div className="lt lt-deck">{[3, 2, 1].map((n) => <i key={n} className={`lt-card lt-card--${n}`} />)}</div>;
    case "orbit":
      return <div className="lt lt-orbit"><i className="lt-ring" /><i className="lt-dot" />{Array.from({ length: 5 }, (_, i) => <i key={i} className="lt-moon" style={{ ["--a" as string]: `${i * 72}deg` }} />)}</div>;
    case "terminal":
      return <div className="lt lt-term"><div className="lt-win"><span className="lt-bar"><i /><i /><i /></span><i className="lt-tline lt-tline--accent" /><i className="lt-tline" /><i className="lt-tline lt-tline--accent lt-short" /><i className="lt-tline lt-short" /></div></div>;
    case "scrapbook":
      return <div className="lt lt-scrap"><i className="lt-photo" /><i className="lt-note" /><i className="lt-tag" /><i className="lt-tag lt-tag--2" /></div>;
    case "hexgrid":
      return <div className="lt lt-hex">{[[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2], [2, 2]].map(([x, y], i) => <i key={i} className={i === 4 ? "is-core" : ""} style={{ ["--x" as string]: x, ["--y" as string]: y }} />)}</div>;
    case "vinyl":
      return <div className="lt lt-vinyl"><i className="lt-disc" /><div className="lt-tracks">{lines(3)}</div></div>;
    case "constellation":
      return <div className="lt lt-const">{[[18, 30], [34, 62], [52, 40], [70, 70], [80, 26], [44, 18]].map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%` }} />)}<i className="lt-bright" /></div>;
  }
}
