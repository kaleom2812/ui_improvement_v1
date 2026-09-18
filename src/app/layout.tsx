import type { Metadata } from "next";
import { Poppins, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuditFlowProvider } from "@/state/audit-flow";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";

// CSS variable names kept as --font-geist-* for continuity with existing
// consumers (tailwind.config.ts, the chart inline styles); the sans face is
// Poppins (geometric, sharper at display sizes for the marketing site).
const fontSans = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-geist-sans",
  display: "swap",
});
const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-mono",
  display: "swap",
});
// Editorial serif — used only for italicised emphasis words inside headings
// (see tailwind.config.ts `fontFamily.serif`), never for full body copy.
const fontSerif = Fraunces({
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

// Applies the persisted theme class to <html> before first paint (no flash).
// The value is written by src/lib/theme.tsx via usePersistentState (JSON-encoded).
const themeScript = `(function(){try{var t=localStorage.getItem('phazeai:theme');if(t){t=t.replace(/^"|"$/g,'');if(t==='dark')document.documentElement.classList.add('dark');}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "GEO Tool — Generative Engine Optimization",
  description:
    "Find out if your brand is visible to AI systems like ChatGPT, Gemini, and Claude. Get a full GEO score with gap analysis and recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable} ${fontSerif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  name: "GEO Tool",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  description:
                    "An enterprise Generative Engine Optimization (GEO) platform that audits, measures, and optimizes brand visibility across major AI engines like ChatGPT, Gemini, and Claude.",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                },
                { "@type": "WebSite", name: "GEO Tool" },
              ],
            }),
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuditFlowProvider>
            <AppShell>{children}</AppShell>
          </AuditFlowProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
