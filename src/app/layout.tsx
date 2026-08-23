import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { MetaPixel } from "@/lib/meta/pixel";
import { MetaPageView } from "@/lib/meta/page-view-tracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Aqui. — A sua empresa à frente de pessoas da sua zona",
    template: "%s — Aqui.",
  },
  description:
    "Compre visualizações no Instagram e Facebook para pessoas da sua zona. Simples de comprar, fácil de acompanhar.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: appUrl,
    siteName: "Aqui.",
    title: "Aqui. — A sua empresa à frente de pessoas da sua zona",
    description:
      "Compre visualizações no Instagram e Facebook para pessoas da sua zona. Simples de comprar, fácil de acompanhar.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={inter.variable}>
      <body>
        {children}
        <MetaPixel />
        <MetaPageView />
        <CookieBanner />
      </body>
    </html>
  );
}
