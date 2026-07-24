"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

function VerifyEmailContent() {
  const params = useSearchParams();
  const success = params.get("success") === "1";
  const error = params.get("error");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setSending(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/"><Logo /></Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          {success ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-xl font-medium text-stone-900 mb-2">Email confirmé !</h1>
              <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                Votre adresse email est vérifiée. Votre compte Educ-Connect est maintenant actif.
              </p>
              <Link href="/login"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Se connecter →
              </Link>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <h1 className="text-xl font-medium text-stone-900 mb-2">
                {error === "invalid" ? "Lien invalide ou expiré" : "Lien manquant"}
              </h1>
              <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                Ce lien de vérification n'est plus valide. Renseignez votre email pour en recevoir un nouveau.
              </p>
              {sent ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
                  ✉️ Un nouvel email de vérification a été envoyé si un compte existe pour cette adresse.
                </div>
              ) : (
                <form onSubmit={resend} className="space-y-3">
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.be"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
                  />
                  <button type="submit" disabled={sending}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                    {sending ? "Envoi…" : "Renvoyer l'email de vérification"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">📬</div>
              <h1 className="text-xl font-medium text-stone-900 mb-2">Vérifiez votre email</h1>
              <p className="text-stone-500 text-sm mb-4 leading-relaxed">
                Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien pour activer votre compte.
              </p>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-orange-700 mb-6">
                Pensez à vérifier vos dossiers <strong>spam</strong> ou <strong>promotions</strong>.
              </div>
              {sent ? (
                <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">
                  ✉️ Email renvoyé — vérifiez votre boîte.
                </p>
              ) : (
                <form onSubmit={resend} className="space-y-3">
                  <p className="text-xs text-stone-400">Vous n'avez pas reçu l'email ?</p>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.be"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
                  />
                  <button type="submit" disabled={sending}
                    className="w-full border border-stone-200 text-stone-600 hover:bg-stone-50 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    {sending ? "Envoi…" : "Renvoyer l'email"}
                  </button>
                </form>
              )}
              <p className="mt-5 text-center text-xs text-stone-400">
                <Link href="/login" className="hover:underline">← Retour à la connexion</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
