import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PUBLIC_TYPES, HEBERGEMENTS, COMMUNES_BRUXELLES } from "@/lib/constants";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

async function getStats() {
  const [communes, secteurs, villes, publics] = await Promise.all([
    prisma.configItem.count({ where: { category: "COMMUNE" } }),
    prisma.configItem.count({ where: { category: "SECTOR" } }),
    prisma.configItem.count({ where: { category: "CITY" } }),
    prisma.configItem.count({ where: { category: "HEBERGEMENT" } }),
  ]);
  return {
    communes:  communes  || COMMUNES_BRUXELLES.length,
    secteurs:  secteurs  || Object.keys(PUBLIC_TYPES).length,
    villes:    villes    || 1,
    publics:   publics   || Object.keys(HEBERGEMENTS).length,
  };
}

export default async function Home() {
  const stats = await getStats();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Logo />
        <Link href="/login"
          className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2 rounded-xl transition-colors font-medium">
          J'ai déjà un compte →
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Badge */}
        <div className="bg-orange-100 text-orange-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Bienvenue 👋
        </div>

        {/* Titre */}
        <h1 className="text-3xl sm:text-4xl font-medium text-stone-900 text-center max-w-2xl mb-4 leading-tight">
          La plateforme qui met en relation étudiants, professionnels et institutions de Belgique francophone
        </h1>
        <p className="text-stone-800 text-center max-w-xl mb-10 leading-relaxed">
          Trouvez votre place dans le secteur social. Educ-Connect simplifie la mise en relation pour que vous puissiez vous concentrer sur l'essentiel.
        </p>

        <p className="text-stone-700 font-medium mb-5">Je suis…</p>

        {/* Choix */}
        <div className="grid sm:grid-cols-3 gap-5 w-full max-w-4xl mb-10">

          <Link href="/etudiants" className="group bg-white border-2 border-orange-400 rounded-2xl p-6 text-center hover:shadow-lg hover:border-orange-500 transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-lg font-medium text-stone-900 mb-2">Étudiant(e)</p>
            <p className="text-sm text-stone-800 mb-5 flex-1">Je poursuis mes études en éducation spécialisée et cherche mon stage ou un job étudiant</p>
            <div className="bg-orange-500 group-hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors mt-auto">
              Créer mon profil →
            </div>
          </Link>

          <Link href="/institutions-accueil" className="group bg-white border-2 border-sky-400 rounded-2xl p-6 text-center hover:shadow-lg hover:border-sky-500 transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
            <div className="text-5xl mb-4">🏥</div>
            <p className="text-lg font-medium text-stone-900 mb-2">Institution</p>
            <p className="text-sm text-stone-800 mb-5 flex-1">J'accueille des stagiaires dans mon établissement</p>
            <div className="bg-sky-600 group-hover:bg-sky-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors mt-auto">
              Je publie des places →
            </div>
          </Link>

          <Link href="/professionnels" className="group bg-white border-2 border-green-400 rounded-2xl p-6 text-center hover:shadow-lg hover:border-green-500 transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
            <div className="text-5xl mb-4">👨‍🏫</div>
            <p className="text-lg font-medium text-stone-900 mb-2">Éducateur(trice) spécialisé(e)</p>
            <p className="text-sm text-stone-800 mb-5 flex-1">Je suis professionnel(le) et cherche un CDI, CDD ou mission</p>
            <div className="bg-green-600 group-hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors mt-auto">
              Créer mon profil →
            </div>
          </Link>

        </div>

        {/* Connexion */}
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-16 bg-stone-200"></div>
          <span className="text-stone-400 text-sm">Vous avez déjà un compte ?</span>
          <div className="h-px w-16 bg-stone-200"></div>
        </div>
        <Link href="/login"
          className="bg-white border-2 border-stone-200 hover:border-stone-400 text-stone-700 hover:text-stone-900 px-8 py-3 rounded-2xl font-medium text-sm transition-all hover:shadow-md">
          🔑 Se connecter à mon compte
        </Link>

        {/* Stats */}
        <div className="flex flex-wrap gap-8 sm:gap-12 text-center mt-14 justify-center">
          <div>
            <p className="text-2xl font-medium text-orange-500">{stats.villes}</p>
            <p className="text-xs text-stone-800 mt-0.5">villes et provinces couvertes</p>
          </div>
          <div className="w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-medium text-orange-500">{stats.communes}</p>
            <p className="text-xs text-stone-800 mt-0.5">commune{stats.communes > 1 ? "s" : ""} couverte{stats.communes > 1 ? "s" : ""}</p>
          </div>
          <div className="w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-medium text-orange-500">{stats.secteurs}</p>
            <p className="text-xs text-stone-800 mt-0.5">secteurs sociaux</p>
          </div>
          <div className="w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-medium text-orange-500">{stats.publics}</p>
            <p className="text-xs text-stone-800 mt-0.5">types de public</p>
          </div>
          <div className="w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-medium text-orange-500">100%</p>
            <p className="text-xs text-stone-800 mt-0.5">gratuit pour les étudiants</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
