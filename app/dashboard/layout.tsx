import { Suspense } from "react";
import { cookies } from "next/headers";
import DashboardShell from "@/components/DashboardShell";
import { I18nProvider } from "@/lib/i18n/client";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/shared";
import { DASH_ACCENT_COOKIE, DASH_THEME_COOKIE, DEFAULT_DASH_ACCENT, normalizeAccent, normalizeDashMode } from "@/lib/dash-theme";
import "../dash-accent.css";
import "../dash-light.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const mode = normalizeDashMode(store.get(DASH_THEME_COOKIE)?.value);
  const accent = normalizeAccent(decodeURIComponent(store.get(DASH_ACCENT_COOKIE)?.value || ""));

  // Applied before first paint so a light/custom-accent dashboard doesn't flash dark purple on load.
  const boot = `(function(){var r=document.documentElement;r.classList.add("dash-active");${mode === "light" ? 'r.classList.add("dash-light");' : ""}${accent !== DEFAULT_DASH_ACCENT ? `r.classList.add("dash-custom-accent");r.style.setProperty("--dash-accent","${accent}");` : ""}})()`;

  return (
    <I18nProvider locale={locale}>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <Suspense fallback={null}>
        <DashboardShell initialMode={mode} initialAccent={accent}>{children}</DashboardShell>
      </Suspense>
    </I18nProvider>
  );
}
