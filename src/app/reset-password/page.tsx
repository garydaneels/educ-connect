"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Minimum 6 caractères."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setDone(true);
    } else {
      setError(data.error || "Erreur lors de la réinitialisation.");
    }
    setLoading(false);
  }

  if (!token) return (
    <div className="text-center">
      <div className="text-5xl mb-4">❌</div>
      <h1 className="text-xl font-medium text-stone-900 mb-2">Lien invalide</h1>
      <p className="text-stone-500 text-sm mb-6">Ce lien de réinitialisation est manquant ou corrompu.</p>
      <Link href="/forgot-password" className="text-orange-600 hover:underline text-sm font-medium">
        Faire une nouvelle demande →
      </Link>
    </div>
  );

  if (done) return (
    <div className="text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-xl font-medium text-stone-900 mb-2">Mot de passe modifié !</h1>
      <p className="text-stone-500 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
      <Link href="/login" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
        Se connecter →
      </Link>
    </div>
  );

  return (
    <>
      <div className="text-center mb-7">
        <div className="text-4xl mb-3">🔐</div>
        <h1 className="text-2xl font-medium text-stone-900">Nouveau mot de passe</h1>
        <p className="text-stone-500 text-sm mt-1">Choisissez un mot de passe sécurisé</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Nouveau mot de passe</label>
          <input
            type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            autoFocus
            placeholder="Minimum 6 caractères"
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirmer le mot de passe</label>
          <input
            type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Répétez le mot de passe"
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition text-stone-900 ${
              confirm && confirm !== password ? "border-red-300 focus:ring-red-200" :
              confirm && confirm === password ? "border-green-300 focus:ring-green-200" :
              "border-stone-200 focus:ring-orange-300"
            }`}
          />
          {confirm && confirm !== password && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>}
          {confirm && confirm === password && <p className="text-xs text-green-600 mt-1">✓ Mots de passe identiques</p>}
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading || (!!confirm && confirm !== password)}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">
          {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          <Suspense>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
