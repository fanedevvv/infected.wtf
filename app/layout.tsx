import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { HALLOWEEN_CHECK } from "@/lib/seasonal";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "INFECTED.WTF",
  description: "Your bio, your links, your fame.",
  icons: {
    icon: [{ url: "/assets/img/logo-square-512.png", type: "image/png" }],
    apple: "/assets/img/logo-square-512.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint: enable scroll reveal and switch on the seasonal theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var c=document.documentElement.classList;if(!matchMedia("(prefers-reduced-motion: reduce)").matches)c.add("js-reveal");if(${HALLOWEEN_CHECK})c.add("theme-halloween")})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
