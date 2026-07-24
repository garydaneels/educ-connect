"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PUBLIC_TYPES } from "@/lib/constants";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") || "STUDENT";

  const [role, setRole] = useState(defaultRole);
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [sector, setSector] = useState("");
  const [address, setAddress] = useState("");
  const [commune, setCommune] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, institutionName, sector, address, commune }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'inscription.");
      setLoading(false);
    } else {
      router.push("/verify-email");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #e0f2fe 100%)" }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-100 px-6 py-4">
        <Link href="/"><Logo /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 w-full max-w-md">
          <div className="text-center mb-7">
            <div className="text-4xl mb-3">✨</div>
            <h1 className="text-2xl font-medium text-stone-900">Créer mon compte</h1>
            <p className="text-sm text-stone-500 mt-1">Créez votre compte Educ-Connect</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Choix du rôle */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Je suis…</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setRole("STUDENT")}
                  className={`h-11 rounded-xl border-2 text-sm font-medium transition-all ${role === "STUDENT" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                  🎓 Étudiant(e)
                </button>
                <button type="button" onClick={() => setRole("PROFESSIONAL")}
                  className={`h-11 rounded-xl border-2 text-sm font-medium transition-all ${role === "PROFESSIONAL" ? "border-green-400 bg-green-50 text-green-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                  👨‍🏫 Pro
                </button>
                <button type="button" onClick={() => setRole("INSTITUTION")}
                  className={`h-11 rounded-xl border-2 text-sm font-medium transition-all ${role === "INSTITUTION" ? "border-sky-400 bg-sky-50 text-sky-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                  🏥 Institution
                </button>
              </div>
            </div>

            {/* Nom du responsable */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                {role === "INSTITUTION" ? "Nom du responsable" : "Nom complet"}
              </label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className={`w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 transition ${
                  role === "INSTITUTION" ? "focus:ring-sky-300" : role === "EDUCATOR" ? "focus:ring-green-300" : "focus:ring-orange-300"
                }`}
                placeholder={role === "INSTITUTION" ? "Jean Dupont" : "Marie Martin"}
              />
            </div>

            {/* Nom de l'institution — uniquement pour les institutions */}
            {role === "INSTITUTION" && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nom de l'institution
                </label>
                <input
                  type="text" required={role === "INSTITUTION"} value={institutionName}
                  onChange={e => setInstitutionName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  placeholder="Ex : ASBL Le Phare, Centre Arc-en-Ciel…"
                />
              </div>
            )}

            {/* Secteur / public — uniquement pour les institutions */}
            {role === "INSTITUTION" && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Secteur principal
                </label>
                <select
                  required={role === "INSTITUTION"} value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 transition bg-white"
                >
                  <option value="">Choisissez un secteur…</option>
                  {Object.entries(PUBLIC_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <p className="text-xs text-stone-400 mt-1">Vous pourrez ajouter d'autres secteurs depuis votre tableau de bord.</p>
              </div>
            )}

            {/* Adresse — uniquement pour les institutions */}
            {role === "INSTITUTION" && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Adresse <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required={role === "INSTITUTION"} value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                    placeholder="Rue de la Loi 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Commune <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required={role === "INSTITUTION"} value={commune}
                    onChange={e => setCommune(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                    placeholder="Namur"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className={`w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 transition ${
                  role === "INSTITUTION" ? "focus:ring-sky-300" : role === "EDUCATOR" ? "focus:ring-green-300" : "focus:ring-orange-300"
                }`}
                placeholder="votre@email.be"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Mot de passe</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 transition ${
                  role === "INSTITUTION" ? "focus:ring-sky-300" : role === "EDUCATOR" ? "focus:ring-green-300" : "focus:ring-orange-300"
                }`}
                placeholder="Minimum 6 caractères"
              />
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password" required minLength={6} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 transition ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-300 focus:ring-red-200"
                    : confirmPassword && confirmPassword === password
                    ? "border-green-300 focus:ring-green-200"
                    : "border-stone-200 focus:ring-orange-300"
                }`}
                placeholder="Répétez votre mot de passe"
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="text-xs text-green-600 mt-1">✓ Mots de passe identiques</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || (!!confirmPassword && confirmPassword !== password)}
              className={`w-full text-white h-11 rounded-xl font-medium transition-colors mt-2 disabled:opacity-50 ${
                role === "INSTITUTION" ? "bg-sky-600 hover:bg-sky-700" : role === "EDUCATOR" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loading ? "Inscription…" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm mt-5 text-stone-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-orange-600 hover:underline font-medium">Se connecter</Link>
          </p>
          <p className="text-center text-xs mt-3 text-stone-400">
            <Link href="/" className="hover:underline">← Retour à l'accueil</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
