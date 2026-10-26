// Chart.js is loaded from a CDN <Script>, so it only exists as `window.Chart`. These are the bits of its API we use.

export interface ChartInstance {
  destroy(): void;
  update(mode?: string): void;
  data: { labels?: unknown[]; datasets: { data: unknown[] }[] };
}

export interface ChartTooltipItem {
  label: string;
  parsed: { x: number; y: number };
}

export interface ChartScriptableContext {
  chart: { ctx: CanvasRenderingContext2D };
}

export type ChartConstructor = new (ctx: CanvasRenderingContext2D | HTMLCanvasElement | null, config: object) => ChartInstance;

declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}
