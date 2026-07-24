import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function ProfessionnelsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="bg-white border-b border-stone-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link href="/login" className="border-2 border-green-400 text-green-600 hover:bg-green-50 px-3 sm:px-4 h-11 flex items-center rounded-xl text-sm font-medium transition-colors">
            Se connecter
          </Link>
          <Link href="/register?role=EDUCATOR" className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 h-11 flex items-center rounded-xl text-sm font-medium transition-colors">
            Créer un compte
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #fef5e7 100%)" }} className="px-4 sm:px-6 py-10 sm:py-14 border-b border-green-100">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="flex-1 w-full">
              <div className="inline-block bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
                Espace professionnels
              </div>
              <h1 className="text-3xl font-medium text-stone-900 mb-4 leading-snug">
                Trouvez votre emploi, <span className="text-green-600">sans intermédiaire</span>
              </h1>
              <p className="text-stone-600 leading-relaxed mb-6">
                En tant qu'éducateur ou éducatrice spécialisé(e), trouvez des opportunités d'emploi directement auprès des institutions de Belgique francophone. CDI, CDD, mission temporaire — tout est centralisé.
              </p>
              <Link href="/register?role=EDUCATOR" className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-6 h-11 rounded-xl font-medium transition-colors">
                Créer mon compte gratuitement →
              </Link>
            </div>
            <div className="text-6xl sm:text-7xl hidden sm:block flex-shrink-0">👨‍🏫</div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="px-6 py-12 border-b border-stone-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-medium text-stone-900 mb-8 text-center">Comment ça marche ?</h2>
            <div className="flex flex-col gap-6">
              {[
                {
                  num: "1",
                  titre: "Créez votre compte professionnel",
                  desc: "En 2 minutes, c'est gratuit. Renseignez vos informations professionnelles et vos diplômes.",
                },
                {
                  num: "2",
                  titre: "Complétez votre profil",
                  desc: "Ajoutez votre CV, vos certifications et vos domaines de compétences. Les institutions voient exactement qui vous êtes.",
                },
                {
                  num: "3",
                  titre: "Parcourez les offres d'emploi",
                  desc: "Consultez toutes les offres d'emploi des institutions de Belgique francophone : CDI, CDD, missions, secteurs divers.",
                },
                {
                  num: "4",
                  titre: "Postulez directement en ligne",
                  desc: "Envoyez votre candidature avec une lettre de motivation personnalisée. Postulez à plusieurs offres en même temps.",
                },
                {
                  num: "5",
                  titre: "Recevez des offres et négociez",
                  desc: "L'institution vous répond directement via la plateforme et propose un entretien. Tout est transparente et sans intermédiaire.",
                },
              ].map((step) => (
                <div key={step.num} className="flex gap-4 items-start">
                  <div className="w-9 h-9 rounded-full bg-green-50 border-2 border-green-400 flex items-center justify-center text-green-700 font-medium text-sm flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 mb-1">{step.titre}</p>
                    <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Secteurs */}
        <section className="px-6 py-12 border-b border-stone-100" style={{ background: "#f0fdf4" }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-medium text-stone-900 mb-3 text-center">Les secteurs qui recrutent</h2>
            <p className="text-sm text-stone-500 text-center mb-8">Trouvez des emplois dans tous les secteurs de l'éducation spécialisée.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { emoji: "🧩", label: "Autisme (TSA)" },
                { emoji: "🧠", label: "Handicap mental (DI)" },
                { emoji: "♿", label: "Handicap moteur" },
                { emoji: "👁️", label: "Handicap sensoriel" },
                { emoji: "👶", label: "Aide à la jeunesse" },
                { emoji: "🏥", label: "Psychiatrie" },
                { emoji: "👴", label: "Seniors (Maison de repos et de soins)" },
              ].map((s) => (
                <span key={s.label} className="bg-white border border-green-200 text-stone-700 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                  <span>{s.emoji}</span> {s.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Communes */}
        <section className="px-6 py-12 border-b border-stone-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-medium text-stone-900 mb-3">Communes couvertes</h2>
            <p className="text-sm text-stone-500 mb-8">Des institutions dans les communes de Belgique francophone.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Anderlecht", "Auderghem", "Berchem-Sainte-Agathe", "Bruxelles (Ville)",
                "Etterbeek", "Evere", "Forest", "Ganshoren", "Ixelles", "Jette",
                "Koekelberg", "Molenbeek-Saint-Jean", "Saint-Gilles", "Saint-Josse-ten-Noode",
                "Schaerbeek", "Uccle", "Watermael-Boitsfort", "Woluwe-Saint-Lambert", "Woluwe-Saint-Pierre",
              ].map((c) => (
                <span key={c} className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 py-14 text-center" style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #fef5e7 100%)" }}>
          <div className="max-w-xl mx-auto">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-medium text-stone-900 mb-3">Prêt(e) à trouver votre emploi ?</h2>
            <p className="text-stone-500 mb-8 leading-relaxed">
              Rejoignez Educ-Connect et accédez à toutes les offres d'emploi des institutions de Belgique francophone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <Link href="/register?role=EDUCATOR" className="bg-green-600 hover:bg-green-700 text-white px-8 h-11 flex items-center justify-center rounded-xl font-medium transition-colors">
                Créer mon compte gratuitement
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
