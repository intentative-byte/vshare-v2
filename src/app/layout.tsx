import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import "@/styles/globals.css";

const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-sora" });
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "VSHARES",
    template: "%s · VSHARES",
  },
  description:
    "Stop doomscrolling. Start value scrolling. VSHARES turns the time you spend scrolling into knowledge you can use.",
  applicationName: "VSHARES",
  robots: { index: false, follow: false },
};

/**
 * Every route renders per request.
 *
 * The Content-Security-Policy carries a per-request nonce (src/proxy.ts), and
 * a nonce cannot exist in HTML generated at build time. Prerendering and a
 * nonce-based policy are mutually exclusive, so we keep the strict policy and
 * render on demand: no 'unsafe-inline' for scripts anywhere.
 *
 * Trade-off recorded as decision D-030. At pilot scale the cost is
 * negligible; if the first-paint budget suffers, revisit with per-build script
 * hashes rather than by weakening the policy.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${sora.variable} ${inter.variable}`}>
      <body>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-bg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
