"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Chart?: any;
  }
}

export default function ViewsChart({ labels, data }: { labels: string[]; data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  function render() {
    if (!window.Chart || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#39ff14";
    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r},${g},${b}`;
    }
    const rgb = accent.startsWith("#") ? hexToRgb(accent) : "57,255,20";
    const fillColor = `rgba(${rgb},0.12)`;

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: accent,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: accent,
            pointBorderColor: `rgba(${rgb},0.3)`,
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: accent,
            pointHoverBorderWidth: 2,
            fill: true,
            backgroundColor: fillColor,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(8,8,20,0.95)",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            titleColor: "rgba(255,255,255,0.6)",
            bodyColor: accent,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items: any) => items[0].label,
              label: (item: any) => item.parsed.y + " views",
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { color: "rgba(255,255,255,0.3)", font: { size: 11 }, maxTicksLimit: 8 },
          },
          y: { display: false, beginAtZero: true },
        },
      },
    });
  }

  useEffect(() => {
    if (window.Chart) {
      render();
    }
    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, data]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js" strategy="afterInteractive" onReady={render} onLoad={render} />
      <div className="chart-wrapper">
        <canvas ref={canvasRef} id="viewsChart" height={80} />
      </div>
    </>
  );
}
