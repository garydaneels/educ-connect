import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { CookieBanner } from "@/components/CookieBanner";
import Script from "next/script";

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

export const metadata: Metadata = {
  title: "Educ-Connect – Stages en secteur social en Belgique francophone",
  description: "La plateforme qui connecte les étudiants en éducation spécialisée avec les institutions sociales de Belgique francophone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col text-stone-900" style={{ background: "linear-gradient(145deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
        {ADSENSE_PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
