"use client";
import { useEffect } from "react";

interface Props {
  slotId: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

declare global {
  interface Window { adsbygoogle: object[]; }
}

export function AdSlot({ slotId, format = "auto", className = "" }: Props) {
  useEffect(() => {
    if (!PUB_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  if (!PUB_ID) {
    return (
      <div className={`flex items-center justify-center border border-dashed border-stone-200 rounded-2xl bg-stone-50/60 text-center py-5 px-4 ${className}`}>
        <div>
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Publicité</p>
          <p className="text-xs text-stone-500 mb-2">Votre annonce ici — 300 × 250 px</p>
          <a
            href="mailto:contact@educonnect.be?subject=Publicité Educ-Connect"
            className="text-xs text-orange-500 hover:text-orange-700 underline font-medium"
          >
            Annoncez sur Educ-Connect →
          </a>
        </div>
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client={PUB_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
