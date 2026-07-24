import Link from "next/link";
import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/prisma";
import { PUBLIC_TYPES } from "@/lib/constants";

const SECTOR_EMOJI: Record<string, string> = {
  ECOLE_PRIMAIRE: "🏫", ECOLE_SECONDAIRE: "🏫", ECOLE_SPECIALISEE: "🎓",
  HOPITAL: "🏥", HOPITAL_PSY: "🧠", SERVICE_SANTE_MENTALE: "💬",
  MAISON_SOIN_PSY: "🏠", AIDE_JEUNESSE: "👶", PRISON: "🔒",
  IPPJ_FERME: "🔐", IPPJ_OUVERT: "🚪", SERVICE_LOGEMENT_ADAPTE: "🏘️",
  INTERNAT: "🛏️", ECOLE_DEVOIRS: "📚", MAISON_JEUNE: "🏡",
  MAISON_SOIN_REPOS: "🌿", SANS_CHEZ_SOIRISME: "⛺", CENTRE_HEBERGEMENT: "🏘️",
  CRECHE: "🍼", EMA: "🚐", CCMD: "👥", PERISCOLAIRE: "⛹️",
  SRG: "🏠", SRU: "🚨", SRJ: "🧒", AMO: "🤝", MECS: "🏡",
  IME: "♿", MAS: "🌸", CHRS: "🏘️", CPAS_ACTION: "🏛️", CENTRE_JOUR: "☀️",
};

export default async function InstitutionsAccueilPage() {
  const dbSectors = await prisma.configItem.findMany({
    where: { category: "SECTOR" },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });

  const sectors = dbSectors.length > 0
    ? dbSectors.map(s => ({ emoji: s.emoji ?? SECTOR_EMOJI[s.key] ?? "🏢", label: s.label }))
    : Object.entries(PUBLIC_TYPES).map(([key, label]) => ({ emoji: SECTOR_EMOJI[key] ?? "🏢", label }));
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="bg-white border-b border-stone-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link href="/login" className="border-2 border-sky-400 text-sky-700 hover:bg-sky-50 px-3 sm:px-4 h-11 flex items-center rounded-xl text-sm font-medium transition-colors">
            Se connecter
          </Link>
          <Link href="/register?role=INSTITUTION" className="bg-sky-600 hover:bg-sky-700 text-white px-3 sm:px-4 h-11 flex items-center rounded-xl text-sm font-medium transition-colors">
            Inscrire mon institution
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section style={{ background: "linear-gradient(160deg, #e0f2fe 0%, #f0fdf4 100%)" }} className="px-4 sm:px-6 py-10 sm:py-14 border-b border-sky-100">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="flex-1 w-full">
              <div className="inline-block bg-sky-100 text-sky-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
                Espace institutions
              </div>
              <h1 className="text-3xl font-medium text-stone-900 mb-4 leading-snug">
                Accueillez les stagiaires <span className="text-sky-600">de demain</span>
              </h1>
              <p className="text-stone-600 leading-relaxed mb-6">
                Référencez votre institution sur Educ-Connect et recevez des candidatures d'étudiants motivés en éducation spécialisée. Gérez tout depuis un tableau de bord simple et humain.
              </p>
              <Link href="/register?role=INSTITUTION" className="inline-flex items-center bg-sky-600 hover:bg-sky-700 text-white px-6 h-11 rounded-xl font-medium transition-colors">
                Inscrire mon institution →
              </Link>
            </div>
            <div className="text-6xl sm:text-7xl hidden sm:block flex-shrink-0">🏥</div>
          </div>
        </section>

        {/* Ce qu'on offre */}
        <section className="px-6 py-12 border-b border-stone-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-medium text-stone-900 mb-2 text-center">Ce qu'Educ-Connect vous offre</h2>
            <p className="text-sm text-stone-500 text-center mb-10">Un outil pensé pour les professionnels du secteur social, pas pour les informaticiens.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  emoji: "📋",
                  titre: "Une fiche institution complète",
                  desc: "Présentez votre établissement en détail : public accompagné, mode d'hébergement, organisme de tutelle (COCOF, ONE, AVIQ, CPAS…), adresse, contact et description libre.",
                },
                {
                  emoji: "📅",
                  titre: "Gestion des disponibilités",
                  desc: "Publiez vos périodes de stage avec les dates de début et de fin, ainsi que le nombre de places disponibles. Mettez à jour en temps réel selon vos capacités.",
                },
                {
                  emoji: "📬",
                  titre: "Réception et gestion des candidatures",
                  desc: "Consultez les candidatures des étudiants, lisez leur message de motivation, acceptez ou refusez directement depuis votre tableau de bord.",
                },
                {
                  emoji: "📆",
                  titre: "Proposition de rendez-vous",
                  desc: "Quand vous acceptez un étudiant, proposez-lui une date et une heure de rendez-vous directement via la plateforme. L'étudiant est notifié immédiatement.",
                },
                {
                  emoji: "✅",
                  titre: "Visibilité auprès des étudiants",
                  desc: "Votre institution est visible par tous les étudiants en éducation spécialisée de Belgique francophone qui cherchent un stage dans votre secteur.",
                },
                {
                  emoji: "🔒",
                  titre: "Validation par notre équipe",
                  desc: "Avant d'être publiée, votre fiche est vérifiée par un administrateur Educ-Connect. Cela garantit la qualité et la fiabilité des institutions présentes sur la plateforme.",
                },
              ].map((item) => (
                <div key={item.titre} className="bg-sky-50 rounded-2xl p-5">
                  <div className="text-3xl mb-3">{item.emoji}</div>
                  <p className="font-medium text-stone-900 mb-2">{item.titre}</p>
                  <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Processus d'inscription */}
        <section className="px-6 py-12 border-b border-stone-100" style={{ background: "#f0f9ff" }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-medium text-stone-900 mb-2 text-center">Comment rejoindre Educ-Connect ?</h2>
            <p className="text-sm text-stone-500 text-center mb-10">L'inscription est simple et rapide. Votre fiche est vérifiée avant publication pour garantir la qualité de la plateforme.</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-center">
              {[
                { num: "1", titre: "Créez votre compte", desc: "Renseignez vos coordonnées de contact" },
                { num: "2", titre: "Remplissez votre fiche", desc: "Décrivez votre institution, public, modes et organismes" },
                { num: "3", titre: "Validation", desc: "Notre équipe vérifie et publie votre fiche sous 48h" },
                { num: "4", titre: "Publiez vos places", desc: "Ajoutez vos disponibilités de stage" },
              ].map((step, i) => (
                <div key={step.num} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 flex-1">
                  <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-medium flex-shrink-0">
                    {step.num}
                  </div>
                  <div className="sm:text-center">
                    <p className="font-medium text-stone-900 text-sm">{step.titre}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Secteurs pris en charge */}
        <section className="px-6 py-12 border-b border-stone-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-medium text-stone-900 mb-3">Votre secteur est le bienvenu</h2>
            <p className="text-sm text-stone-500 mb-8">Educ-Connect référence les institutions de tous les secteurs de l'aide sociale de Belgique francophone.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {sectors.map((s) => (
                <div key={s.label} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3">
                  <span className="text-xl">{s.emoji}</span>
                  <p className="text-sm font-medium text-stone-900">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 py-14 text-center" style={{ background: "linear-gradient(160deg, #e0f2fe 0%, #f0fdf4 100%)" }}>
          <div className="max-w-xl mx-auto">
            <div className="text-4xl mb-4">🤝</div>
            <h2 className="text-2xl font-medium text-stone-900 mb-3">Rejoignez Educ-Connect</h2>
            <p className="text-stone-500 mb-8 leading-relaxed">
              Faites partie du réseau d'institutions qui forment les éducateurs spécialisés de demain. L'inscription est gratuite.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <Link href="/register?role=INSTITUTION" className="bg-sky-600 hover:bg-sky-700 text-white px-8 h-11 flex items-center justify-center rounded-xl font-medium transition-colors">
                Inscrire mon institution
              </Link>
              <Link href="/login" className="border-2 border-stone-200 text-stone-600 hover:bg-stone-50 px-8 h-11 flex items-center justify-center rounded-xl font-medium transition-colors">
                J'ai déjà un compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-5 text-xs text-stone-400 border-t border-stone-100">
        © 2026 Educ-Connect – Plateforme de stages en secteur social en Belgique francophone
      </footer>
    </div>
  );
}
