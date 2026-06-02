import "./globals.css";
import "../styles/auth.css";
import "../styles/discovehr.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Space_Grotesk, Inter_Tight } from "next/font/google";

// Self-hosted via next/font — no external round-trip at runtime.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "DiscoveHR — Talent Discovery. Simplified. Decentralized.",
  description: "The decentralized hiring infrastructure for enterprise scale.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spaceGrotesk.variable} ${interTight.variable}`}>
      <body>{children}</body>
    </html>
  );
}
