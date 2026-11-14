import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Mentions légales – Educ-Connect",
  description: "Identité de l'exploitant de la plateforme Educ-Connect.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #f1e5da 0%, #e3d8e8 50%, #fdcba4 100%)" }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-4 h-11 flex items-center rounded-xl transition-colors font-medium">
          ← Retour
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 py-12 w-full">
        <h1 className="text-3xl font-medium text-stone-900 mb-10">Mentions légales</h1>

        <div className="space-y-8 text-stone-800 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">Éditeur du site</h2>
            <p>Nom : [À COMPLÉTER]</p>
            <p>Statut : [À COMPLÉTER]</p>
            <p>Adresse : [À COMPLÉTER]</p>
            <p>Numéro d'entreprise (BCE) : [À COMPLÉTER]</p>
            <p>Numéro de TVA : [À COMPLÉTER, ou mention « non assujetti »]</p>
            <p>
              Contact :{" "}
              <a href="mailto:contact@educonnect.be" className="text-orange-600 hover:underline">
                contact@educonnect.be
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">Hébergement</h2>
            <p>Le site est hébergé par Vercel Inc. (États-Unis). La base de données est hébergée par Supabase (Union européenne).</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">Propriété intellectuelle</h2>
            <p>
              Le logo, la charte graphique, les textes et le code de la plateforme sont protégés. Toute reproduction non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">Données personnelles</h2>
            <p>
              Le traitement des données personnelles est décrit dans la{" "}
              <Link href="/politique-confidentialite" className="text-orange-600 hover:underline">politique de confidentialité</Link>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
