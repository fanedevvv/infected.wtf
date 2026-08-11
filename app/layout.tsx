import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["700", "800"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["400", "500", "600"] });

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
    <html lang="en" className={`${syne.variable} ${outfit.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700&display=swap" />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">{children}</body>
    </html>
  );
}
