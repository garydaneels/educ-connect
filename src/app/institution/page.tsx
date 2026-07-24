"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { AdSlot } from "@/components/AdSlot";

interface Institution {
  id: string;
  name: string;
  commune: string;
  address: string;
  boosted: boolean;
  boostEndDate?: string;
  subscription?: { status: string; endDate?: string; plan?: string } | null;
  description?: string;
  mission?: string;
  publicTypes: string;
  hebergements: string;
  organismes: string;
  views: number;
  slots: { id: string; availablePlaces: number; totalPlaces: number }[];
}

const visibilityInfo = {
  visible: { label: "Visible par les étudiants", color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-400" },
  hidden:  { label: "Non visible — abonnement requis", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-400" },
};

function InstitutionPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/institutions/mine", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setInstitution(data); setLoading(false); });
  }, [status]);

  if (status === "loading" || loading) return null;

  const sub = institution?.subscription;
  const isActive = sub?.status === "ACTIVE";
  const fmtShort = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });

  const types = institution ? JSON.parse(institution.publicTypes) as string[] : [];
  const hebs  = institution ? JSON.parse(institution.hebergements) as string[] : [];
  const orgs  = institution ? JSON.parse(institution.organismes) as string[] : [];

  const profileComplete = !!(institution?.description && institution?.mission && (types.length > 0 || hebs.length > 0 || orgs.length > 0));
  const totalSlots = institution?.slots?.length ?? 0;
  const totalPlaces = institution?.slots?.reduce((a, s) => a + s.availablePlaces, 0) ?? 0;

  return (
    <>
      <Navbar />
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">

        {/* ── Sidebar ── */}
        <aside className="lg:w-72 lg:flex-shrink-0 p-4 lg:p-5 flex flex-col gap-3 lg:gap-4 border-b lg:border-b-0 lg:border-r border-stone-100 bg-white/40 backdrop-blur-sm lg:overflow-y-auto lg:max-h-[calc(100vh-56px)]">

          <AdSlot slotId="1122334455" format="rectangle" className="min-h-[250px]" />

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Statistiques</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">👁 Vues sur ma fiche</span>
                <span className="text-lg font-medium text-sky-600">{institution?.views ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">📅 Périodes de stage</span>
                <span className="text-lg font-medium text-orange-500">{totalSlots}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">🪑 Places disponibles</span>
                <span className="text-lg font-medium text-green-600">{totalPlaces}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Navigation</p>
            <div className="space-y-1.5">
              {[
                { href: "/institution/dashboard", label: "📊 Tableau de bord" },
                { href: "/institution/applications", label: "💬 Candidatures" },
                { href: "/institution/membership", label: "⭐ Abonnement" },
                { href: "/institution/billing", label: "💳 Facturation" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="flex items-center text-sm text-stone-600 hover:text-sky-600 hover:bg-sky-50 px-3 py-2 rounded-xl transition-colors">
                  {l.label}
                </Link>
              ))}
              {institution && (
                <a href={`/institutions/${institution.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-2 rounded-xl transition-colors font-medium border border-sky-200 mt-2">
                  <span>👁️</span> Voir ma fiche publique
                  <span className="ml-auto text-xs opacity-60">↗</span>
                </a>
              )}
            </div>
          </div>

        </aside>

        {/* ── Contenu principal ── */}
        <main className="flex-1 p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-56px)]">

          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-medium text-stone-900">Mon institution</h1>
            {institution && (
              <a href={`/institutions/${institution.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-white border border-stone-200 hover:border-sky-300 hover:text-sky-700 text-stone-600 px-4 py-2 rounded-xl transition-all font-medium shadow-sm">
                <span>👁️</span> Aperçu vue étudiant
                <span className="text-xs opacity-50">↗</span>
              </a>
            )}
          </div>

          {/* ── Bannière statut ── */}
          <div className="mb-5 space-y-3">
            {isActive ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse"></span>
                  <div>
                    <p className="text-sm font-medium text-green-800">✅ Institution publiée — visible par les étudiants</p>
                    {sub?.endDate && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Abonnement {sub.plan === "SCHOOL" ? "scolaire" : "annuel"} valable jusqu'au{" "}
                        <strong>{fmtShort(sub.endDate)}</strong>
                        {new Date(sub.endDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30 && (
                          <span className="ml-2 text-amber-600 font-semibold">⚠️ Expire bientôt</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <a href="/institution/membership"
                  className="text-xs text-green-700 border border-green-300 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
                  Gérer l'abonnement
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {sub?.status === "PENDING_PAYMENT" ? "⏳ Paiement en attente — non visible" : "🔒 Non publié — abonnement requis"}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {sub?.status === "PENDING_PAYMENT"
                        ? "Votre institution sera visible dès confirmation du paiement."
                        : "Activez un abonnement pour apparaître dans les recherches des étudiants."}
                    </p>
                  </div>
                </div>
                <a href="/institution/membership"
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
                  Activer →
                </a>
              </div>
            )}

          </div>

          {institution && (
            <OnboardingBanner
              storageKey={`institution-onboarding-v1-${institution.id}`}
              title="Bienvenue sur Educ-Connect !"
              intro="Complétez ces étapes pour commencer à recevoir des candidatures :"
              color="sky"
              steps={[
                { label: "Compléter la description", done: !!(institution.description && institution.mission) },
                { label: "Activer un abonnement", done: institution.subscription?.status === "ACTIVE", href: "/institution/membership" },
                { label: "Créer des plages de stage", done: institution.slots?.length > 0 },
              ]}
            />
          )}

          {/* ── 2 grandes cartes ── */}
          <div className="grid md:grid-cols-2 gap-5 mt-2">

            {/* Carte 1 — Mon profil */}
            <Link href="/institution/profile"
              className="group bg-white border border-stone-100 hover:border-sky-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-3xl mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  🏛️
                </div>
                <h2 className="text-xl font-medium text-stone-900">Mon profil</h2>
                <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
                  Description, mission, informations de contact, secteurs et équipe
                </p>
              </div>
              <div className="px-6 py-5 flex-1 flex flex-col gap-3">
                <div className="space-y-2">
                  {[
                    { label: "Description", done: !!institution?.description },
                    { label: "Mission", done: !!institution?.mission },
                    { label: "Secteurs & filtres", done: types.length > 0 || hebs.length > 0 || orgs.length > 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2.5 text-sm">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${item.done ? "bg-green-100 text-green-600" : "bg-stone-100 text-stone-400"}`}>
                        {item.done ? "✓" : "○"}
                      </span>
                      <span className={item.done ? "text-stone-700" : "text-stone-400"}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-4 border-t border-stone-50">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${profileComplete ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {profileComplete ? "✓ Profil complet" : "À compléter"}
                    </span>
                    <span className="text-sm font-medium text-sky-600 group-hover:text-sky-700">
                      Modifier →
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Carte 2 — Proposer des stages */}
            <Link href="/institution/stages"
              className={`group bg-white border rounded-2xl shadow-sm transition-all overflow-hidden flex flex-col ${isActive ? "border-stone-100 hover:border-orange-200 hover:shadow-md" : "border-stone-200 opacity-80"}`}>
              <div className={`px-6 pt-8 pb-6 flex flex-col items-center text-center ${isActive ? "bg-gradient-to-br from-orange-50 to-amber-50" : "bg-stone-50"}`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm ${isActive ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white group-hover:scale-105 transition-transform" : "bg-stone-200 text-stone-400"}`}>
                  {isActive ? "📅" : "🔒"}
                </div>
                <h2 className="text-xl font-medium text-stone-900">Proposer des stages</h2>
                <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
                  Créez vos périodes de stage et gérez les places disponibles
                </p>
              </div>
              <div className="px-6 py-5 flex-1 flex flex-col gap-3">
                {isActive ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                        <p className="text-2xl font-medium text-orange-600">{totalSlots}</p>
                        <p className="text-xs text-stone-500 mt-0.5">période{totalSlots > 1 ? "s" : ""}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                        <p className="text-2xl font-medium text-green-600">{totalPlaces}</p>
                        <p className="text-xs text-stone-500 mt-0.5">place{totalPlaces > 1 ? "s" : ""} dispo</p>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-stone-50">
                      <div className="flex items-center justify-end">
                        <span className="text-sm font-medium text-orange-600 group-hover:text-orange-700">
                          Gérer mes stages →
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-2">
                    <p className="text-sm text-stone-500">
                      Un abonnement actif est nécessaire pour publier des places de stage.
                    </p>
                    <span className="inline-block bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-lg">
                      🔒 Abonnement requis
                    </span>
                  </div>
                )}
              </div>
            </Link>

          </div>

          {/* ── Offres d'emploi (2 cartes secondaires) ── */}
          <div className="mt-5 grid sm:grid-cols-2 gap-4">

            {/* CDI / CDD */}
            <div className={`bg-white border rounded-2xl shadow-sm px-5 py-4 flex flex-col gap-3 ${isActive ? "border-stone-100" : "border-stone-200 opacity-80"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-xl flex-shrink-0">
                  📋
                </div>
                <div>
                  <h3 className="font-medium text-stone-900 text-sm">CDI / CDD</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Publiez des offres d'emploi permanentes ou temporaires</p>
                </div>
              </div>
              {isActive ? (
                <a href="/institution/jobs"
                  className="block text-center text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                  Gérer les offres CDI/CDD →
                </a>
              ) : (
                <a href="/institution/membership"
                  className="block text-center text-xs bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl font-medium transition-colors">
                  🔒 Abonnement requis
                </a>
              )}
            </div>

            {/* Jobs étudiants */}
            <div className={`bg-white border rounded-2xl shadow-sm px-5 py-4 flex flex-col gap-3 ${isActive ? "border-stone-100" : "border-stone-200 opacity-80"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl flex-shrink-0">
                  💼
                </div>
                <div>
                  <h3 className="font-medium text-stone-900 text-sm">Jobs étudiants</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Publiez des jobs, intérim ou bénévolat pour étudiants</p>
                </div>
              </div>
              {isActive ? (
                <a href="/institution/jobs"
                  className="block text-center text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                  Gérer les jobs étudiants →
                </a>
              ) : (
                <a href="/institution/membership"
                  className="block text-center text-xs bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl font-medium transition-colors">
                  🔒 Abonnement requis
                </a>
              )}
            </div>

          </div>

        </main>
      </div>
    </>
  );
}

export default function InstitutionPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionPageContent />
    </Suspense>
  );
}
