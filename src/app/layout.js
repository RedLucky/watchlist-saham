import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
      <body className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] text-slate-900 dark:text-white font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Analytics />
          <SpeedInsights />
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX"} />
          {process.env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />}
        </ThemeProvider>
      </body>
    </html>
  );
}
