import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PUBLIC_TYPES, HEBERGEMENTS } from "@/lib/constants";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [provinces, cities, secteurs, publics] = await Promise.all([
      prisma.province.count(),
      prisma.city.count(),
      prisma.configItem.count({ where: { category: "SECTOR" } }),
      prisma.configItem.count({ where: { category: "HEBERGEMENT" } }),
    ]);
    return {
      villes:    provinces || 1,
      communes:  cities    || 19,
      secteurs:  secteurs  || Object.keys(PUBLIC_TYPES).length,
      publics:   publics   || Object.keys(HEBERGEMENTS).length,
    };
  } catch (error) {
    // Fallback to defaults if DB unavailable during build
    return {
      villes:    1,
      communes:  19,
      secteurs:  Object.keys(PUBLIC_TYPES).length,
      publics:   Object.keys(HEBERGEMENTS).length,
    };
  }
}

const ROLES = [
  {
    href: "/etudiants",
    title: "étudiant.e",
    text: "Trouve ton prochain stage ou job étudiant.",
    cta: "CRÉER MON PROFIL",
  },
  {
    href: "/institutions-accueil",
    title: "institution",
    text: "Publiez vos places de stage et rencontrez les bons profils.",
    cta: "PUBLIER DES PLACES",
  },
  {
    href: "/professionnels",
    title: "éducateur.rice spécialisé.e",
    text: "Trouve ton prochain CDI, CDD ou mission.",
    cta: "CRÉER MON PROFIL",
  },
];

export default async function Home() {
  const stats = await getStats();
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(circle at 100% 0%, #374c9c 0%, rgba(55,76,156,0) 45%), radial-gradient(circle at 0% 100%, #fdcba4 0%, rgba(253,203,164,0) 50%), #e3d8e8",
      }}
    >
      <header className="bg-white/70 backdrop-blur-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Logo />
        <Link
          href="/login"
          className="text-xs font-medium tracking-wide text-brand-ink border border-brand-indigo bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
        >
          J&apos;AI DÉJÀ UN COMPTE
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-3xl sm:text-5xl font-light text-brand-ink text-center max-w-3xl mb-6 leading-tight">
          La plateforme qui met en relation{" "}
          <em className="font-semibold italic font-serif text-brand-indigo">éducateurs stagiaires ou diplômés</em>{" "}
          avec les institutions francophone belge.
        </h1>
        <p className="text-brand-ink text-center max-w-xl mb-12 leading-relaxed">
          Trouvez votre place dans le secteur social. Educ-Connect simplifie la mise en relation pour que vous puissiez vous concentrer sur l&apos;essentiel.
        </p>

        <p className="text-brand-ink font-medium mb-5">Je suis…</p>

        <div className="grid sm:grid-cols-3 gap-5 w-full max-w-4xl mb-12">
          {ROLES.map(role => (
            <Link
              key={role.href}
              href={role.href}
              className="group bg-white/60 backdrop-blur-sm border border-white/80 rounded-3xl p-6 text-center shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col"
            >
              <p className="text-2xl font-semibold text-brand-ink mb-3">{role.title}</p>
              <p className="text-sm text-brand-ink mb-6 flex-1 leading-relaxed">{role.text}</p>
              <span className="bg-brand-indigo group-hover:bg-brand-ink text-white rounded-full py-2 text-xs font-medium tracking-wide transition-colors mt-auto">
                {role.cta}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-16 bg-brand-ink/30"></div>
          <span className="text-brand-ink text-sm">Vous avez déjà un compte ?</span>
          <div className="h-px w-16 bg-brand-ink/30"></div>
        </div>
        <Link
          href="/login"
          className="bg-white border border-brand-indigo text-brand-ink hover:bg-brand-indigo hover:text-white px-8 py-3 rounded-full font-medium text-sm transition-colors"
        >
          Se connecter à mon compte
        </Link>

        <div className="flex flex-wrap gap-8 sm:gap-12 text-center mt-14 justify-center">
          <div>
            <p className="text-2xl font-semibold text-brand-indigo">{stats.villes}</p>
            <p className="text-xs text-brand-ink mt-0.5">villes et provinces couvertes</p>
          </div>
          <div className="w-px bg-brand-ink/20 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-semibold text-brand-indigo">{stats.communes}</p>
            <p className="text-xs text-brand-ink mt-0.5">commune{stats.communes > 1 ? "s" : ""} couverte{stats.communes > 1 ? "s" : ""}</p>
          </div>
          <div className="w-px bg-brand-ink/20 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-semibold text-brand-indigo">{stats.secteurs}</p>
            <p className="text-xs text-brand-ink mt-0.5">secteurs sociaux</p>
          </div>
          <div className="w-px bg-brand-ink/20 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-semibold text-brand-indigo">{stats.publics}</p>
            <p className="text-xs text-brand-ink mt-0.5">types de public</p>
          </div>
          <div className="w-px bg-brand-ink/20 hidden sm:block"></div>
          <div>
            <p className="text-2xl font-semibold text-brand-indigo">100%</p>
            <p className="text-xs text-brand-ink mt-0.5">gratuit pour les étudiants</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
