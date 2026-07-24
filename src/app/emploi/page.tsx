import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import EmploiClient from "./EmploiClient";

export const metadata = {
  title: "Offres CDI & CDD – Educ-Connect",
  description: "CDI et CDD dans le secteur social de Belgique francophone. Trouvez votre prochain poste.",
};

export default function EmploiPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-stone-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <div className="flex gap-3">
          <Link href="/login" className="border-2 border-violet-400 text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Se connecter
          </Link>
          <Link href="/register" className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Créer un compte
          </Link>
        </div>
      </header>

      <section style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 100%)" }} className="px-6 py-12 border-b border-violet-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-violet-100 text-violet-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
            Offres d'emploi
          </div>
          <h1 className="text-3xl font-medium text-stone-900 mb-3 leading-snug">
            Trouvez votre poste <span className="text-violet-600">CDI ou CDD</span>
          </h1>
          <p className="text-stone-600 leading-relaxed max-w-xl mx-auto">
            Offres d'emploi permanentes et temporaires proposées par les institutions sociales de Belgique francophone.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-800 border border-violet-200 text-xs font-medium px-3 py-1.5 rounded-full">
              📋 CDI
            </span>
            <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-medium px-3 py-1.5 rounded-full">
              📋 CDD
            </span>
            <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-600 border border-stone-200 text-xs font-medium px-3 py-1.5 rounded-full">
              + Jobs étudiants, intérim…
            </span>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-5 py-8">
        <Suspense fallback={<div className="text-center py-20 text-stone-400">Chargement…</div>}>
          <EmploiClient defaultContractTypes={["CDI", "CDD"]} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
