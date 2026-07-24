import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Politique de confidentialité – Educ-Connect",
  description: "Comment Educ-Connect collecte, utilise et protège vos données personnelles.",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-4 h-11 flex items-center rounded-xl transition-colors font-medium">
          ← Retour
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 py-12 w-full">
        <h1 className="text-3xl font-medium text-stone-900 mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-stone-500 mb-10">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-8 text-stone-800 leading-relaxed">

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles collectées via Educ-Connect est l'exploitant
              de la plateforme, joignable à l'adresse{" "}
              <a href="mailto:contact@educonnect.be" className="text-orange-600 hover:underline">
                contact@educonnect.be
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">2. Données collectées</h2>
            <p className="mb-3">Lors de l'utilisation d'Educ-Connect, les données suivantes peuvent être collectées :</p>
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <p className="font-medium text-stone-900 mb-1">Données de compte</p>
                <p className="text-sm text-stone-600">Nom, prénom, adresse email, mot de passe (haché), rôle (étudiant ou institution)</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <p className="font-medium text-stone-900 mb-1">Profil étudiant</p>
                <p className="text-sm text-stone-600">École, section, présentation, expériences, stages précédents, CV et lettre de motivation (fichiers uploadés)</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <p className="font-medium text-stone-900 mb-1">Profil institution</p>
                <p className="text-sm text-stone-600">Nom, adresse, description, mission, secteur d'activité, référent de stage</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <p className="font-medium text-stone-900 mb-1">Données de navigation</p>
                <p className="text-sm text-stone-600">Cookies de session, préférences d'affichage (stockés localement)</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">3. Finalités du traitement</h2>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li>Permettre la mise en relation entre étudiants et institutions</li>
              <li>Gérer les candidatures et le suivi des stages</li>
              <li>Envoyer des notifications liées à votre activité sur la plateforme</li>
              <li>Améliorer les fonctionnalités du service</li>
              <li>Respecter les obligations légales applicables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">4. Base légale</h2>
            <p>
              Le traitement de vos données repose sur votre consentement (lors de l'inscription) et sur
              l'exécution du contrat de service qui vous lie à Educ-Connect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">5. Durée de conservation</h2>
            <p>
              Vos données sont conservées aussi longtemps que votre compte est actif. En cas de suppression du
              compte, vos données personnelles sont supprimées dans un délai de <strong>30 jours</strong>, sauf
              obligation légale de conservation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">6. Partage des données</h2>
            <p className="mb-2">
              Vos données ne sont pas vendues à des tiers. Elles peuvent être transmises à :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li>Les institutions auxquelles vous postulez (nom, profil, CV, lettre de motivation)</li>
              <li>Des prestataires techniques hébergeant la plateforme (hébergeur VPS), soumis à des obligations de confidentialité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">7. Cookies</h2>
            <p className="mb-2">Educ-Connect utilise uniquement des cookies essentiels :</p>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li><strong>Cookie de session</strong> : maintient votre connexion (supprimé à la fermeture du navigateur)</li>
              <li><strong>Préférences locales</strong> : bannières ignorées, choix d'affichage (stockés dans votre navigateur uniquement)</li>
            </ul>
            <p className="mt-2">Aucun cookie publicitaire ni de suivi tiers n'est déposé sans votre consentement.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">8. Vos droits (RGPD)</h2>
            <p className="mb-3">Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: "👁️", label: "Droit d'accès", desc: "Consulter les données que nous détenons sur vous" },
                { icon: "✏️", label: "Droit de rectification", desc: "Corriger des données inexactes ou incomplètes" },
                { icon: "🗑️", label: "Droit à l'effacement", desc: "Demander la suppression de vos données" },
                { icon: "⏸️", label: "Droit à la limitation", desc: "Restreindre temporairement le traitement" },
                { icon: "📦", label: "Droit à la portabilité", desc: "Recevoir vos données dans un format lisible" },
                { icon: "🚫", label: "Droit d'opposition", desc: "Vous opposer à certains traitements" },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="bg-white rounded-xl border border-stone-100 p-3 flex gap-3 items-start">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{label}</p>
                    <p className="text-xs text-stone-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">
              Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:contact@educonnect.be" className="text-orange-600 hover:underline">contact@educonnect.be</a>.
              Vous pouvez également introduire une réclamation auprès de l'
              <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                Autorité de protection des données (APD)
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">9. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos
              données contre tout accès non autorisé, perte ou destruction (chiffrement des mots de passe,
              connexions sécurisées HTTPS, accès restreint aux données).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-stone-900 mb-3">10. Contact</h2>
            <p>
              Pour toute question relative à la présente politique :{" "}
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
