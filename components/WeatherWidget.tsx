function WeatherIcon({ code }: { code: number }) {
  // Collapse WMO codes into the handful of icon families we actually draw.
  if (code === 0 || code === 1) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />
      </svg>
    );
  }
  if (code === 2 || code === 3 || code === 45 || code === 48) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 19a4.5 4.5 0 0 1-.5-8.98A6 6 0 0 1 17.6 9 4.5 4.5 0 0 1 17 19H6.5z" />
      </svg>
    );
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 16a4.5 4.5 0 0 1-.5-8.98A6 6 0 0 1 18.6 6 4.5 4.5 0 0 1 18 16H7.5z" />
        <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
      </svg>
    );
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 16a4.5 4.5 0 0 1-.5-8.98A6 6 0 0 1 18.6 6 4.5 4.5 0 0 1 18 16H7.5z" />
        <path d="M8 19v2M12 19v2M16 19v2" />
      </svg>
    );
  }
  // thunderstorms (95/96/99) and anything unmapped
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 15a4.5 4.5 0 0 1-.5-8.98A6 6 0 0 1 18.6 5 4.5 4.5 0 0 1 18 15H7.5z" />
      <path d="M13 15l-2.5 4h3L11 23" />
    </svg>
  );
}

export default function WeatherWidget({ tempC, code, description, location }: { tempC: number; code: number; description: string; location: string }) {
  return (
    <div className="game-int-card" style={{ ["--int-color" as string]: "#38bdf8" }} title={`${description} in ${location}`}>
      <div className="game-int-icon" style={{ color: "#38bdf8" }}>
        <WeatherIcon code={code} />
      </div>
      <div className="game-int-info">
        <div className="game-int-name">{tempC}°C · {description}</div>
        <div className="game-int-sub">{location}</div>
      </div>
    </div>
  );
}
