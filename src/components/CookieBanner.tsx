"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_EVENT } from "@/lib/cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setVisible(true);
  }, []);

  function choose(value: "accepted" | "refused") {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-3xl mx-auto bg-stone-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed">
          <p>
            Educ-Connect utilise des cookies essentiels au fonctionnement de la plateforme (session, préférences).
            En continuant, vous acceptez leur utilisation.{" "}
            <Link href="/politique-confidentialite" className="underline text-orange-300 hover:text-orange-200">
              En savoir plus
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => choose("refused")}
            className="px-4 py-2 rounded-xl text-sm border border-stone-600 hover:bg-stone-800 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={() => choose("accepted")}
            className="px-4 py-2 rounded-xl text-sm bg-orange-500 hover:bg-orange-600 font-medium transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
