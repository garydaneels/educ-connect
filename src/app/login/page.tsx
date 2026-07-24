"use client";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", { email, password, redirect: false });

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      const session = await getSession();
      const role = (session?.user as { role?: string })?.role;
      if (role === "STUDENT") router.push("/student");
      else if (role === "INSTITUTION") router.push("/institution");
      else if (role === "PROFESSIONAL") router.push("/professional/jobs");
      else if (role === "ADMIN") router.push("/admin");
      else router.push("/");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });
    setForgotSent(true);
    setForgotLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #e0f2fe 100%)" }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-6 py-4">
        <Link href="/"><Logo /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 w-full max-w-md">

          {!showForgot ? (
            <>
              <div className="text-center mb-7">
                <div className="text-4xl mb-3">👋</div>
                <h1 className="text-2xl font-medium text-stone-900">Content de vous revoir !</h1>
                <p className="text-sm text-stone-500 mt-1">Connectez-vous à votre compte Educ-Connect</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
                    placeholder="votre@email.be"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-stone-700">Code d'accès</label>
                    <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); }}
                      className="text-xs text-orange-500 hover:text-orange-600 hover:underline transition-colors">
                      Code oublié ?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
                    placeholder="••••••••"
                  />
                </div>
                {error ? (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors mt-2"
                >
                  {loading ? "Connexion…" : "Se connecter"}
                </button>
              </form>

              <p className="text-center text-sm mt-5 text-stone-500">
                Pas encore de compte ?{" "}
                <Link href="/register" className="text-orange-600 hover:underline font-medium">S'inscrire gratuitement</Link>
              </p>
              <p className="text-center text-xs mt-3 text-stone-400">
                <Link href="/" className="hover:underline">← Retour à l'accueil</Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-7">
                <div className="text-4xl mb-3">🔑</div>
                <h1 className="text-2xl font-medium text-stone-900">Code oublié</h1>
                <p className="text-sm text-stone-500 mt-1">Nous vous enverrons un nouveau code par email</p>
              </div>

              {forgotSent ? (
                <div className="space-y-5">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                    <div className="text-3xl mb-2">✉️</div>
                    <p className="text-sm font-medium text-green-800">Email envoyé !</p>
                    <p className="text-xs text-green-700 mt-1">
                      Si un compte existe pour <strong>{forgotEmail}</strong>, vous recevrez un nouveau code dans quelques instants.
                    </p>
                  </div>
                  <p className="text-xs text-stone-400 text-center">
                    Pensez à vérifier vos spams. Une fois connecté, changez votre code depuis votre espace.
                  </p>
                  <button onClick={() => setShowForgot(false)}
                    className="w-full border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
                    ← Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Votre adresse email</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
                      placeholder="votre@email.be"
                    />
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                    {forgotLoading ? "Envoi…" : "Envoyer un nouveau code"}
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)}
                    className="w-full border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm hover:bg-stone-50 transition-colors">
                    ← Retour à la connexion
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
