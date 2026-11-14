"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_EVENT } from "@/lib/cookie-consent";

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

export function AdsenseScript() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const read = () => setAllowed(localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted");
    read();
    window.addEventListener(COOKIE_CONSENT_EVENT, read);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, read);
  }, []);

  if (!PUB_ID || !allowed) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
