import type { Metadata, Viewport } from "next";
import { Inter, Geist, Geist_Mono, Big_Shoulders_Stencil } from "next/font/google";
import "./globals.css";
import "./lab.css";
import { HALLOWEEN_CHECK } from "@/lib/seasonal";

// Inter stays loaded for public profiles, which render in it unless the owner picked another font.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const stencil = Big_Shoulders_Stencil({ variable: "--font-stencil", subsets: ["latin"], weight: ["600", "800", "900"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://infected.wtf"),
  title: "INFECTED.WTF",
  description: "Get infected. One link that spreads every side of you.",
  icons: {
    icon: [{ url: "/assets/img/mark.svg", type: "image/svg+xml" }],
    apple: "/assets/img/logo-square-512.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable} ${geistMono.variable} ${stencil.variable} h-full antialiased`} suppressHydrationWarning>
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
