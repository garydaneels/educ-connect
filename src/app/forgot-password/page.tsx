"use client";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Veuillez entrer votre adresse email."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setSent(true);
    } else {
      setError("Une erreur est survenue. Réessayez.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-sky-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/"><Logo /></Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h1 className="text-xl font-medium text-stone-900 mb-2">Email envoyé !</h1>
              <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                Si un compte existe avec l'adresse <strong>{email}</strong>, vous allez recevoir un lien de réinitialisation dans quelques instants.
                <br /><br />
                Cliquez sur le lien dans l'email pour choisir un nouveau mot de passe. Il expire après 1 heure.
              </p>
              <Link href="/login"
                className="inline-block bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Retour à la connexion →
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-medium text-stone-900 mb-1">Mot de passe oublié ?</h1>
              <p className="text-stone-500 text-sm mb-6">
                Entrez votre email — nous vous enverrons un lien pour choisir un nouveau mot de passe.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1.5">Adresse email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.be"
                    autoFocus
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm transition-colors">
                  {loading ? "Envoi…" : "Envoyer le code"}
                </button>
              </form>
              <p className="text-center text-sm text-stone-400 mt-4">
                <Link href="/login" className="hover:text-stone-600 transition-colors">← Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
