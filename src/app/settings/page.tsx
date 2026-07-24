"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface EmailPrefs {
  emailInstitutionInterest: boolean;
  emailApplicationStatus: boolean;
  emailNewMessage: boolean;
  emailScheduleUpdate: boolean;
  emailNewApplication: boolean;
  emailUnavailability: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id?: string; role?: string; name?: string; email?: string } | undefined;

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/settings/notifications")
      .then(r => r.json())
      .then(data => setPrefs(data))
      .catch(() => {});
  }, [user?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (newPass.length < 6) { setError("Minimum 6 caractères."); return; }
    setLoading(true);
    setError("");
    setSuccess(false);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSuccess(true);
      setCurrent(""); setNewPass(""); setConfirm("");
    } else {
      setError(data.error || "Erreur lors de la mise à jour.");
    }
    setLoading(false);
  }

  async function togglePref(key: keyof EmailPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsLoading(true);
    setPrefsSaved(false);
    try {
      await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch {
      setPrefs(prefs);
    } finally {
      setPrefsLoading(false);
    }
  }

  if (status === "loading") return null;

  const isStudent = user?.role === "STUDENT";
  const isInstitution = user?.role === "INSTITUTION";

  const studentPrefs = [
    { key: "emailInstitutionInterest" as const, label: "Une institution s'intéresse à mon profil", desc: "Reçois un email quand une institution marque son intérêt pour toi" },
    { key: "emailApplicationStatus" as const, label: "Ma candidature change de statut", desc: "Acceptée, refusée, stage confirmé ou arrêté" },
    { key: "emailNewMessage" as const, label: "Je reçois un nouveau message", desc: "Quand une institution t'envoie un message" },
    { key: "emailScheduleUpdate" as const, label: "Réponse à ma demande d'horaire", desc: "L'institution accepte ou refuse ta demande de changement d'horaire" },
  ];

  const institutionPrefs = [
    { key: "emailNewApplication" as const, label: "Je reçois une nouvelle candidature", desc: "Quand un étudiant postule chez toi" },
    { key: "emailNewMessage" as const, label: "Je reçois un nouveau message", desc: "Quand un étudiant t'envoie un message" },
    { key: "emailUnavailability" as const, label: "Un stagiaire signale une indisponibilité ou demande un changement d'horaire", desc: "Pendant le stage en cours" },
  ];

  const prefList = isStudent ? studentPrefs : isInstitution ? institutionPrefs : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-5 py-10 w-full">
        <h1 className="text-2xl font-medium text-stone-900 mb-1">Paramètres du compte</h1>
        <p className="text-stone-500 text-sm mb-8">Gérez les informations de votre compte Educ-Connect.</p>

        {/* Infos compte */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-medium text-stone-900 mb-4">Informations du compte</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-20 shrink-0">Nom</span>
              <span className="text-stone-900 font-medium">{user?.name || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-20 shrink-0">Email</span>
              <span className="text-stone-900">{user?.email || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-20 shrink-0">Rôle</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                user?.role === "STUDENT" ? "bg-orange-100 text-orange-700" :
                user?.role === "INSTITUTION" ? "bg-sky-100 text-sky-700" :
                "bg-stone-100 text-stone-600"
              }`}>
                {user?.role === "STUDENT" ? "🎓 Étudiant(e)" :
                 user?.role === "INSTITUTION" ? "🏥 Institution" :
                 user?.role === "ADMIN" ? "⚙️ Admin" : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Préférences emails */}
        {prefList.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-medium text-stone-900">Préférences emails</h2>
              {prefsSaved && <span className="text-xs text-green-600 font-medium">✓ Sauvegardé</span>}
            </div>
            <p className="text-sm text-stone-500 mb-5">Choisis les emails que tu veux recevoir. Les emails de sécurité (vérification, mot de passe) sont toujours envoyés.</p>

            {prefs === null ? (
              <div className="text-sm text-stone-400">Chargement…</div>
            ) : (
              <div className="space-y-4">
                {prefList.map(({ key, label, desc }) => (
                  <label key={key} className={`flex items-start gap-4 cursor-pointer rounded-xl p-3 transition-colors ${prefsLoading ? "opacity-60 pointer-events-none" : "hover:bg-stone-50"}`}>
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={prefs[key]}
                        onChange={() => togglePref(key)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${prefs[key] ? "bg-orange-500" : "bg-stone-200"}`} />
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{label}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Changer le mot de passe */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-base font-medium text-stone-900 mb-1">Changer le mot de passe</h2>
          <p className="text-sm text-stone-500 mb-5">Choisissez un mot de passe sécurisé d'au moins 6 caractères.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Mot de passe actuel</label>
              <input type="password" required value={current} onChange={e => setCurrent(e.target.value)}
                placeholder="Votre mot de passe actuel"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Nouveau mot de passe</label>
              <input type="password" required minLength={6} value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirmer le nouveau mot de passe</label>
              <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Répétez le mot de passe"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition text-stone-900 ${
                  confirm && confirm !== newPass ? "border-red-300 focus:ring-red-200" :
                  confirm && confirm === newPass ? "border-green-300 focus:ring-green-200" :
                  "border-stone-200 focus:ring-orange-300"
                }`} />
              {confirm && confirm !== newPass && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>}
              {confirm && confirm === newPass && <p className="text-xs text-green-600 mt-1">✓ Mots de passe identiques</p>}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
            {success && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">✅ Mot de passe mis à jour avec succès.</p>}

            <button type="submit" disabled={loading || (!!confirm && confirm !== newPass)}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 h-11 rounded-xl font-medium text-sm transition-colors">
              {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
