import { Metadata } from "next";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact – Educ-Connect",
  description: "Contactez l'équipe Educ-Connect pour toute question sur la plateforme de stages en secteur social de Belgique francophone.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-4 h-11 flex items-center rounded-xl transition-colors font-medium">
          ← Retour
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-5 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-medium text-stone-900 mb-2">Contactez-nous</h1>
          <p className="text-stone-500">Une question, une suggestion ou un problème ? Nous vous répondons sous 48h.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Infos de contact */}
          <div className="space-y-5">
            {[
              { icon: "✉️", label: "Email", value: "contact@educonnect.be", href: "mailto:contact@educonnect.be" },
              { icon: "🕐", label: "Délai de réponse", value: "Sous 48h ouvrables", href: null },
              { icon: "🌍", label: "Zone couverte", value: "Belgique francophone", href: null },
            ].map(({ icon, label, value, href }) => (
              <div key={label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-start gap-4">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs text-stone-400 font-medium mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm text-orange-600 hover:underline font-medium">{value}</a>
                  ) : (
                    <p className="text-sm text-stone-800 font-medium">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-orange-50 rounded-2xl border border-orange-100 p-5">
              <p className="text-sm font-medium text-stone-900 mb-2">Institution intéressée ?</p>
              <p className="text-xs text-stone-600 leading-relaxed mb-3">
                Pour rejoindre Educ-Connect et accueillir des stagiaires, créez un compte institution et activez votre abonnement.
              </p>
              <Link href="/register?role=INSTITUTION"
                className="inline-block text-xs bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                Créer un compte institution →
              </Link>
            </div>
          </div>

          {/* Formulaire */}
          <div className="md:col-span-2">
            <ContactForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
