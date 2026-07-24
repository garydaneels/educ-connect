import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Conditions générales d'utilisation – Educ-Connect",
  description: "Conditions générales d'utilisation de la plateforme Educ-Connect.",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-4 h-11 flex items-center rounded-xl transition-colors font-medium">
          ← Retour
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 py-12 w-full">
        <h1 className="text-3xl font-medium text-stone-900 mb-2">Conditions générales d'utilisation</h1>
        <p className="text-sm text-stone-500 mb-10">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-8 text-stone-800 leading-relaxed">

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">1. Présentation de la plateforme</h2>
            <p>
              Educ-Connect est une plateforme en ligne qui met en relation des étudiants en éducation spécialisée
              avec des institutions sociales de Belgique francophone proposant des places de stage ou
              des offres d'emploi étudiant. La plateforme est exploitée à titre d'indépendant complémentaire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">2. Accès à la plateforme</h2>
            <p className="mb-2">
              L'utilisation d'Educ-Connect est <strong>gratuite pour les étudiants</strong>. Les institutions
              accèdent à certaines fonctionnalités via un abonnement payant.
            </p>
            <p>
              L'accès est réservé aux personnes majeures ou autorisées par un représentant légal. En créant un
              compte, vous certifiez que les informations fournies sont exactes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">3. Obligations des utilisateurs</h2>
            <p className="mb-2">Tout utilisateur s'engage à :</p>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li>Fournir des informations véridiques et à jour</li>
              <li>Ne pas usurper l'identité d'une autre personne ou institution</li>
              <li>Ne pas utiliser la plateforme à des fins commerciales non autorisées</li>
              <li>Respecter la confidentialité des échanges avec les autres utilisateurs</li>
              <li>Ne pas transmettre de contenus illicites, diffamatoires ou portant atteinte aux droits de tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">4. Responsabilité</h2>
            <p className="mb-2">
              Educ-Connect agit en tant qu'intermédiaire entre étudiants et institutions. La plateforme ne peut
              garantir la conclusion d'un contrat de stage ni l'exactitude des informations publiées par les institutions.
            </p>
            <p>
              Educ-Connect ne saurait être tenu responsable des dommages directs ou indirects résultant de
              l'utilisation de la plateforme, d'une interruption de service ou d'une perte de données.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">5. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments composant la plateforme (logo, design, textes, code) est la propriété
              exclusive d'Educ-Connect. Toute reproduction ou utilisation non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">6. Suspension et résiliation</h2>
            <p>
              Educ-Connect se réserve le droit de suspendre ou supprimer tout compte en cas de violation des
              présentes conditions, sans préavis ni indemnité.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">7. Modifications</h2>
            <p>
              Educ-Connect peut modifier les présentes CGU à tout moment. Les utilisateurs seront informés de
              toute modification substantielle. L'utilisation continue de la plateforme vaut acceptation des
              nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">8. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit belge. En cas de litige, les tribunaux de
              les tribunaux belges compétents sont seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">9. Contact</h2>
            <p>
              Pour toute question relative aux présentes conditions :{" "}
              <a href="mailto:contact@educonnect.be" className="text-orange-600 hover:underline">
                contact@educonnect.be
              </a>
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
