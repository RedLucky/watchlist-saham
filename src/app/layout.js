import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

// "Bursa 1985" typography (ADR 0001): Sans for UI text, Serif for page titles,
// Mono for prices, tickers and small labels. Mapped to font-sans / font-serif /
// font-mono in src/app/globals.css.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "IDX Watchlist — Smart Stock Analysis",
  description: "Indonesian stock analysis dashboard for conservative swing trading with transparent scoring, smart money detection, and sector rotation insights.",
  keywords: ["IDX", "stock analysis", "swing trading", "IHSG", "Indonesian stocks", "Saham", "BEI", "Kalkulator Pensiun"],
  openGraph: {
    title: "IDX Watchlist — Smart Stock Analysis",
    description: "Platform cerdas untuk analisis saham BEI dan perencanaan pensiun. Temukan saham berkinerja tinggi dan rotasi sektoral dengan mudah.",
    url: "https://watchlist-saham.vercel.app",
    siteName: "IDX Watchlist",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IDX Watchlist — Smart Stock Analysis",
    description: "Analisis saham Indonesia dan kalkulator FIRE pensiun SBN.",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} min-h-screen bg-canvas text-ink font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          {(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV) && <Analytics />}
          {(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV) && <SpeedInsights />}
          {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
          {process.env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />}
        </ThemeProvider>
      </body>
    </html>
  );
}
