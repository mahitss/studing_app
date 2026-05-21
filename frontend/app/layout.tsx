import type { Metadata } from "next";
import { Manrope, Orbitron } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Orbitron({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "GrindLock | The Ultimate Productivity OS for Students",
  description: "Master your focus with GrindLock's brutal accountability system. 3D timers, deep analytics, and social pressure to keep you grinding.",
  keywords: ["productivity", "study tracker", "focus timer", "pomodoro", "analytics", "student tools", "GrindLock"],
  authors: [{ name: "GrindLock Team" }],
  robots: "index, follow",
  manifest: "/manifest.json",
};

import GrindLock3D from "../components/GrindLock3D";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0c1220",
              color: "#e6edf9",
              border: "1px solid rgba(124, 140, 255, 0.15)",
              fontFamily: "var(--font-body), sans-serif",
            },
          }}
        />
        <GrindLock3D />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
