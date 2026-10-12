import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { Lexend } from "next/font/google";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://educ-connect.be"),
  title: {
    default: "Educ-Connect – Stages en secteur social en Belgique francophone",
    template: "%s | Educ-Connect",
  },
  description: "La plateforme qui connecte les étudiants en éducation spécialisée avec les institutions sociales de Belgique francophone. Trouvez votre stage AESI, BESI ou MESI facilement.",
  keywords: ["stage éducation spécialisée", "stage secteur social Belgique", "AESI stage", "BESI stage", "institutions sociales Belgique", "stage Wallonie", "stage Bruxelles", "éducateur spécialisé stage"],
  alternates: {
    canonical: "https://educ-connect.be",
  },
  openGraph: {
    type: "website",
    locale: "fr_BE",
    url: "https://educ-connect.be",
    siteName: "Educ-Connect",
    title: "Educ-Connect – Stages en secteur social en Belgique francophone",
    description: "La plateforme qui connecte les étudiants en éducation spécialisée avec les institutions sociales de Belgique francophone.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Educ-Connect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Educ-Connect – Stages en secteur social en Belgique francophone",
    description: "La plateforme qui connecte les étudiants en éducation spécialisée avec les institutions sociales de Belgique francophone.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://educ-connect.be/#organization",
      name: "Educ-Connect",
      url: "https://educ-connect.be",
      logo: { "@type": "ImageObject", url: "https://educ-connect.be/logo.png" },
      description: "Plateforme de mise en relation entre étudiants en éducation spécialisée et institutions sociales de Belgique francophone.",
    },
    {
      "@type": "WebSite",
      "@id": "https://educ-connect.be/#website",
      url: "https://educ-connect.be",
      name: "Educ-Connect",
      publisher: { "@id": "https://educ-connect.be/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://educ-connect.be/institutions-accueil?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`h-full ${lexend.variable}`}>
      <body className="min-h-full flex flex-col text-stone-900" style={{ background: "linear-gradient(145deg, #f1e5da 0%, #e3d8e8 50%, #fdcba4 100%)" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
        <Analytics />
      </body>
    </html>
  );
}
