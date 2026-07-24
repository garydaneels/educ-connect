"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { AdSlot } from "@/components/AdSlot";
import { Pagination } from "@/components/Pagination";
import { PUBLIC_TYPES, HEBERGEMENTS, ORGANISMES, SECTEUR_EMOJI } from "@/lib/constants";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Slot {
  id: string;
  availablePlaces: number;
  description?: string;
}

interface Institution {
  id: string;
  name: string;
  address: string;
  commune: string;
  phone?: string;
  email?: string;
  description?: string;
  publicTypes: string;
  hebergements: string;
  organismes: string;
  boosted?: boolean;
  lat?: number | null;
  lng?: number | null;
  slots: Slot[];
}


interface ConfigEntry { id: string; key: string; label: string; emoji?: string | null; parentKey?: string | null }
interface AppConfig {
  SECTOR: ConfigEntry[];
  HEBERGEMENT: ConfigEntry[];
  ORGANISME: ConfigEntry[];
  CITY: ConfigEntry[];
  COMMUNE: ConfigEntry[];
}

export default function StudentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [config, setConfig] = useState<AppConfig>({ SECTOR: [], HEBERGEMENT: [], ORGANISME: [], CITY: [], COMMUNE: [] });
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [city, setCity] = useState("");
  const [commune, setCommune] = useState("");
  const [publicType, setPublicType] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyModal, setApplyModal] = useState<{ institution: Institution; slot: Slot } | null>(null);
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState("");
  const [appliedSlotIds, setAppliedSlotIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [stageStart, setStageStart] = useState("");
  const [stageEnd, setStageEnd]     = useState("");
  const [appStats, setAppStats] = useState({ pending: 0, accepted: 0, ongoing: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileCvPath, setProfileCvPath] = useState<string | null>(null);
  const [profileLetterPath, setProfileLetterPath] = useState<string | null>(null);
  const [useProfileCv, setUseProfileCv] = useState(false);
  const [useProfileLetter, setUseProfileLetter] = useState(false);
  const [interestedInMe, setInterestedInMe] = useState<Set<string>>(new Set());

  const user = session?.user as { role?: string } | undefined;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "STUDENT") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then((d: AppConfig) => setConfig(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/applications")
      .then(r => r.json())
      .then((data: { slotId: string; status: string; stageStatus?: string }[]) => {
        if (Array.isArray(data)) {
          setAppliedSlotIds(new Set(data.map(a => a.slotId)));
          setAppStats({
            pending:  data.filter(a => a.status === "PENDING").length,
            accepted: data.filter(a => a.status === "ACCEPTED").length,
            ongoing:  data.filter(a => a.stageStatus === "ONGOING").length,
          });
        }
      })
      .catch(() => {});
    fetch("/api/student/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.presentation) setProfileComplete(true);
        if (data?.cvPath) { setProfileCvPath(data.cvPath); setUseProfileCv(true); }
        if (data?.letterPath) { setProfileLetterPath(data.letterPath); setUseProfileLetter(true); }
      })
      .catch(() => {});
    fetch("/api/student/interests")
      .then(r => r.ok ? r.json() : [])
      .then((ids: string[]) => setInterestedInMe(new Set(ids)))
      .catch(() => {});
  }, []);

  const buildParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams();
    if (commune)    params.set("commune", commune);
    if (publicType) params.set("publicType", publicType);
    if (stageStart) params.set("stageStart", stageStart);
    if (stageEnd)   params.set("stageEnd", stageEnd);
    params.set("take", "8");
    params.set("skip", String((pageNum - 1) * 8));
    return params;
  }, [commune, publicType, stageStart, stageEnd]);

  const search = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setPage(pageNum);
    const res = await fetch(`/api/institutions?${buildParams(pageNum)}`);
    const data = await res.json();
    setInstitutions(data.institutions ?? data);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [buildParams]);

  useEffect(() => { search(1); }, [search]);

  async function handleApply() {
    if (!applyModal) return;
    setApplying(true);
    const fd = new FormData();
    fd.append("slotId", applyModal.slot.id);
    fd.append("institutionId", applyModal.institution.id);
    if (message) fd.append("message", message);
    if (cvFile) fd.append("cv", cvFile);
    else if (useProfileCv && profileCvPath) fd.append("cvPath", profileCvPath);
    if (letterFile) fd.append("letter", letterFile);
    else if (useProfileLetter && profileLetterPath) fd.append("letterPath", profileLetterPath);

    try {
      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAppliedSlotIds(prev => new Set([...prev, applyModal.slot.id]));
        router.push("/student/applications");
      } else {
        setToast(`❌ ${data.error || "Erreur lors de l'envoi"}`);
        setTimeout(() => setToast(""), 5000);
      }
    } catch {
      setToast("❌ Erreur réseau — réessayez");
      setTimeout(() => setToast(""), 5000);
    }
    setApplying(false);
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const totalPlaces = institutions.reduce((acc, i) => acc + i.slots.reduce((a, s) => a + s.availablePlaces, 0), 0);

  if (status === "loading") return null;

  return (
    <>
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2">
          ✅ {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-6 py-5 mb-6">
          <h1 className="text-2xl font-medium text-stone-900 mb-1">
            Bonjour {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-stone-800">Trouvez l'institution qui vous correspond parmi nos partenaires de Belgique francophone.</p>
        </div>

        {/* Stats candidatures */}
        {(appStats.pending > 0 || appStats.accepted > 0 || appStats.ongoing > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {appStats.ongoing > 0 && (
              <Link href="/student/applications" className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 hover:shadow-sm transition-shadow">
                <p className="text-2xl font-bold text-emerald-700">{appStats.ongoing}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Stage en cours</p>
              </Link>
            )}
            {appStats.accepted > 0 && (
              <Link href="/student/applications" className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 hover:shadow-sm transition-shadow">
                <p className="text-2xl font-bold text-sky-700">{appStats.accepted}</p>
                <p className="text-xs text-sky-600 mt-0.5">RDV fixé{appStats.accepted > 1 ? "s" : ""}</p>
              </Link>
            )}
            {appStats.pending > 0 && (
              <Link href="/student/applications" className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:shadow-sm transition-shadow">
                <p className="text-2xl font-bold text-amber-700">{appStats.pending}</p>
                <p className="text-xs text-amber-600 mt-0.5">En attente de réponse</p>
              </Link>
            )}
          </div>
        )}

        {/* Onboarding */}
        <OnboardingBanner
          storageKey="student-onboarding-v1"
          title="Bienvenue sur Educ-Connect !"
          intro="Voici les étapes pour trouver votre stage :"
          steps={[
            { label: "Complétez votre profil", done: profileComplete, href: "/student/profile" },
            { label: "Recherchez une institution", done: true },
            { label: "Postulez à une offre", done: appStats.pending > 0 || appStats.accepted > 0 || appStats.ongoing > 0 },
          ]}
        />

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-8">
          <p className="text-sm font-medium text-stone-700 mb-4">🔍 Filtrer les institutions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

            {/* Ville */}
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
                Ville / Province
              </label>
              <select
                value={city}
                onChange={e => { setCity(e.target.value); setCommune(""); }}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
              >
                <option value="">Toutes les villes</option>
                {config.CITY.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            {/* Commune — visible uniquement si une ville sélectionnée */}
            <div className={city ? "" : "opacity-30 pointer-events-none"}>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
                Commune
              </label>
              <select
                value={commune}
                onChange={e => setCommune(e.target.value)}
                disabled={!city}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900 disabled:bg-stone-50"
              >
                <option value="">Toutes les communes</option>
                {config.COMMUNE.filter(c => !c.parentKey || c.parentKey === city.toUpperCase() || c.parentKey.toLowerCase() === city.toLowerCase()).map(c => (
                  <option key={c.key} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Secteur */}
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
                Secteur d'activité
              </label>
              <select
                value={publicType}
                onChange={e => setPublicType(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
              >
                <option value="">Tous les secteurs</option>
                {config.SECTOR.length > 0
                  ? config.SECTOR.map(s => (
                      <option key={s.key} value={s.key}>{s.emoji ? `${s.emoji} ` : ""}{s.label}</option>
                    ))
                  : Object.entries(PUBLIC_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{SECTEUR_EMOJI[k] ? `${SECTEUR_EMOJI[k]} ` : ""}{v}</option>
                    ))
                }
              </select>
            </div>
          </div>

          {/* Filtre par période de stage */}
          <div className="border-t border-stone-50 pt-4">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">📅 Ma période de stage</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Début du stage</label>
                <input
                  type="date"
                  value={stageStart}
                  onChange={e => setStageStart(e.target.value)}
                  max={stageEnd || undefined}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Fin du stage</label>
                <input
                  type="date"
                  value={stageEnd}
                  onChange={e => setStageEnd(e.target.value)}
                  min={stageStart || undefined}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
                />
              </div>
            </div>
            {stageStart && stageEnd && (
              <p className="text-xs text-orange-600 mt-2">
                Seules les institutions avec des places disponibles du{" "}
                <strong>{new Date(stageStart).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}</strong>
                {" "}au{" "}
                <strong>{new Date(stageEnd).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</strong>
                {" "}sont affichées.
              </p>
            )}
          </div>

          {/* Filtres actifs */}
          {(city || commune || publicType || stageStart || stageEnd) && (
            <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-400">Filtres actifs :</span>
              {stageStart && stageEnd && (
                <span className="text-xs bg-sky-100 text-sky-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  📅 {new Date(stageStart).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })} → {new Date(stageEnd).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}
                  <button onClick={() => { setStageStart(""); setStageEnd(""); }} className="ml-1 hover:text-sky-900">×</button>
                </span>
              )}
              {city && !commune && (
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  📍 {config.CITY.find(c => c.key === city)?.label ?? city}
                  <button onClick={() => { setCity(""); setCommune(""); }} className="ml-1 hover:text-orange-900">×</button>
                </span>
              )}
              {commune && (
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  📍 {commune}
                  <button onClick={() => setCommune("")} className="ml-1 hover:text-orange-900">×</button>
                </span>
              )}
              {publicType && (
                <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  {config.SECTOR.find(s => s.key === publicType)?.emoji ?? SECTEUR_EMOJI[publicType] ?? ""}{" "}
                  {config.SECTOR.find(s => s.key === publicType)?.label ?? PUBLIC_TYPES[publicType]}
                  <button onClick={() => setPublicType("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              <button onClick={() => { setCity(""); setCommune(""); setPublicType(""); setStageStart(""); setStageEnd(""); }} className="text-xs text-stone-400 hover:text-orange-600 transition-colors ml-auto">
                Tout effacer ×
              </button>
            </div>
          )}
        </div>

        {/* Résumé résultats + toggle vue */}
        {!loading && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-stone-500">
              <span className="font-medium text-stone-900">{total || institutions.length}</span> institution{(total || institutions.length) > 1 ? "s" : ""} trouvée{(total || institutions.length) > 1 ? "s" : ""}
              {totalPlaces > 0 && <> · <span className="font-medium text-orange-600">{totalPlaces} place{totalPlaces > 1 ? "s" : ""} disponible{totalPlaces > 1 ? "s" : ""}</span></>}
            </p>
            <div className="flex items-center gap-2">
              {(city || commune || publicType || stageStart || stageEnd) && (
                <button onClick={() => { setCity(""); setCommune(""); setPublicType(""); setStageStart(""); setStageEnd(""); }} className="text-xs text-stone-400 hover:text-orange-600 transition-colors">
                  Effacer les filtres ×
                </button>
              )}
              <div className="flex border border-stone-200 rounded-xl overflow-hidden text-xs">
                <button onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 transition-colors ${viewMode === "list" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"}`}>
                  ☰ Liste
                </button>
                <button onClick={() => setViewMode("map")}
                  className={`px-3 py-1.5 transition-colors ${viewMode === "map" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"}`}>
                  🗺️ Carte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vue carte */}
        {!loading && viewMode === "map" && (() => {
          const mapped = institutions.filter(i => i.lat && i.lng).map(i => ({
            id: i.id,
            lat: i.lat!,
            lng: i.lng!,
            name: i.name,
            commune: i.commune,
            boosted: i.boosted,
            popupContent: (
              <div style={{ minWidth: 180 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14 }}>{i.name}</p>
                <p style={{ margin: "0 0 6px", color: "#78716c", fontSize: 12 }}>📍 {i.commune}</p>
                {i.slots.length > 0 && (
                  <p style={{ margin: "0 0 8px", color: "#ea580c", fontSize: 12 }}>
                    {i.slots.reduce((a, s) => a + s.availablePlaces, 0)} place{i.slots.reduce((a, s) => a + s.availablePlaces, 0) > 1 ? "s" : ""} disponible{i.slots.reduce((a, s) => a + s.availablePlaces, 0) > 1 ? "s" : ""}
                  </p>
                )}
                <a href={`/institutions/${i.id}`} style={{ display: "inline-block", background: "#ea580c", color: "#fff", padding: "4px 12px", borderRadius: 8, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                  Voir l&apos;offre →
                </a>
              </div>
            ),
          }));
          return (
            <div className="mb-8">
              {mapped.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-sm text-amber-700">
                  Aucune institution avec une adresse géocodée pour le moment. Les points apparaîtront automatiquement quand les institutions mettront à jour leur profil.
                </div>
              ) : (
                <>
                  <p className="text-xs text-stone-400 mb-2">{mapped.length} sur {institutions.length} institution{institutions.length > 1 ? "s" : ""} géolocalisée{mapped.length > 1 ? "s" : ""}</p>
                  <MapView markers={mapped} height="520px" />
                </>
              )}
            </div>
          );
        })()}

        {/* Résultats liste */}
        {loading ? (
          <div className="text-center py-20 text-stone-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Chargement...</p>
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-stone-700 font-medium mb-1">Aucune institution trouvée</p>
            <p className="text-stone-400 text-sm">Essayez d'autres critères de recherche.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {institutions.map(inst => {
              const types = JSON.parse(inst.publicTypes) as string[];
              const hebs = JSON.parse(inst.hebergements) as string[];
              const orgs = JSON.parse(inst.organismes) as string[];
              const sectorMap = Object.fromEntries(config.SECTOR.map(s => [s.key, s]));
              const hebMap = Object.fromEntries(config.HEBERGEMENT.map(h => [h.key, h]));
              const orgMap = Object.fromEntries(config.ORGANISME.map(o => [o.key, o]));
              const totalDispo = inst.slots.reduce((a, s) => a + s.availablePlaces, 0);

              return (
                <div key={inst.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${inst.boosted ? "border-2 border-sky-300" : "border border-stone-100"}`}>
                  {inst.boosted && (
                    <div className="bg-sky-50 border-b border-sky-200 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-xs">🚀</span>
                      <span className="text-xs font-medium text-sky-700">Institution mise en avant</span>
                    </div>
                  )}
                  {interestedInMe.has(inst.id) && (
                    <div className="bg-blue-50 border-b border-blue-200 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-sm">👍</span>
                      <span className="text-xs font-medium text-blue-700">Cette institution est intéressée par vous</span>
                    </div>
                  )}
                  {/* Header carte */}
                  <div className="p-5 border-b border-stone-50">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/institutions/${inst.id}`} className="text-lg font-medium text-stone-900 leading-tight hover:text-orange-600 transition-colors">
                        {inst.name}
                      </Link>
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2.5 py-1 rounded-full ml-2 flex-shrink-0">
                        📍 {inst.commune}
                      </span>
                    </div>
                    {inst.description && (
                      <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{inst.description}</p>
                    )}
                    <Link href={`/institutions/${inst.id}`} className="inline-block mt-2 text-xs text-sky-600 hover:underline">
                      Voir la fiche complète →
                    </Link>
                  </div>

                  {/* Tags */}
                  <div className="px-5 py-3 border-b border-stone-50">
                    <div className="flex flex-wrap gap-1.5">
                      {types.map(t => (
                        <span key={t} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full">
                          {sectorMap[t]?.emoji ?? SECTEUR_EMOJI[t] ?? ""} {sectorMap[t]?.label ?? PUBLIC_TYPES[t] ?? t}
                        </span>
                      ))}
                      {hebs.map(h => (
                        <span key={h} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full">
                          {hebMap[h]?.label ?? HEBERGEMENTS[h] ?? h}
                        </span>
                      ))}
                      {orgs.map(o => (
                        <span key={o} className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full">
                          {orgMap[o]?.label ?? ORGANISMES[o] ?? o}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Places */}
                  <div className="px-5 py-4">
                    {inst.slots.length === 0 || totalDispo === 0 ? (
                      <p className="text-sm text-stone-400 italic text-center py-2">
                        Aucune place disponible actuellement
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                          Places disponibles
                        </p>
                        {inst.slots.map(slot => (
                          <div key={slot.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                            <div>
                              <p className="text-sm font-medium text-stone-800">
                                {slot.description || "Offre de stage"}
                              </p>
                              <p className="text-xs text-orange-600 font-medium mt-0.5">
                                {slot.availablePlaces} place{slot.availablePlaces > 1 ? "s" : ""} disponible{slot.availablePlaces > 1 ? "s" : ""}
                              </p>
                            </div>
                            {appliedSlotIds.has(slot.id) ? (
                              <span className="ml-3 text-xs text-stone-400 bg-stone-100 border border-stone-200 px-4 py-2 rounded-xl flex-shrink-0 font-medium">
                                ✓ Déjà postulé
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setApplyModal({ institution: inst, slot });
                                  setMessage("");
                                  setCvFile(null);
                                  setLetterFile(null);
                                  setUseProfileCv(!!profileCvPath);
                                  setUseProfileLetter(!!profileLetterPath);
                                  setToast("");
                                  fetch(`/api/institutions/${inst.id}/view`, { method: "POST" });
                                }}
                                className="ml-3 bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-xl transition-colors flex-shrink-0 font-medium"
                              >
                                Postuler
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : null}

        {/* Publicité */}
        {!loading && institutions.length > 0 && (
          <AdSlot slotId="1234567890" format="horizontal" className="mt-8 min-h-[90px]" />
        )}

        {/* Pagination */}
        {!loading && viewMode === "list" && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / 8)}
            onPageChange={search}
          />
        )}
      </main>

      {/* Modal candidature */}
      {applyModal && (
        <div className="fixed inset-0 bg-stone-800/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">📝</div>
              <h2 className="text-xl font-medium text-stone-900">Envoyer ma candidature</h2>
              <p className="text-sm text-stone-500 mt-1">
                {applyModal.institution.name}
              </p>
              {applyModal.slot.description && (
                <div className="inline-block bg-orange-50 text-orange-700 text-xs px-3 py-1 rounded-full mt-2">
                  {applyModal.slot.description}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Message de motivation <span className="text-stone-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none text-stone-900"
                  placeholder="Présentez-vous brièvement et expliquez pourquoi cette institution vous intéresse..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* CV */}
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-stone-700 mb-1.5">📄 CV</p>
                  {profileCvPath && !cvFile ? (
                    <div className="flex-1 flex flex-col border-2 border-green-300 bg-green-50 rounded-xl p-3 text-center">
                      <span className="text-xl mb-1">✅</span>
                      <span className="text-xs text-green-700 font-medium mb-2">CV du profil</span>
                      <label className="text-xs text-stone-500 underline cursor-pointer hover:text-orange-600 mt-auto">
                        Changer
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                          onChange={e => { setCvFile(e.target.files?.[0] || null); setUseProfileCv(false); }} />
                      </label>
                    </div>
                  ) : (
                    <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 cursor-pointer transition-colors text-center ${cvFile ? "border-orange-300 bg-orange-50" : "border-stone-200 hover:border-orange-300 hover:bg-orange-50"}`}>
                      <span className="text-xl mb-1">{cvFile ? "✅" : "⬆️"}</span>
                      <span className="text-xs text-stone-600 font-medium break-all">
                        {cvFile ? cvFile.name : "Choisir"}
                      </span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => setCvFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>

                {/* Lettre */}
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-stone-700 mb-1.5">✉️ Lettre</p>
                  {profileLetterPath && !letterFile ? (
                    <div className="flex-1 flex flex-col border-2 border-green-300 bg-green-50 rounded-xl p-3 text-center">
                      <span className="text-xl mb-1">✅</span>
                      <span className="text-xs text-green-700 font-medium mb-2">Lettre du profil</span>
                      <label className="text-xs text-stone-500 underline cursor-pointer hover:text-orange-600 mt-auto">
                        Changer
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                          onChange={e => { setLetterFile(e.target.files?.[0] || null); setUseProfileLetter(false); }} />
                      </label>
                    </div>
                  ) : (
                    <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 cursor-pointer transition-colors text-center ${letterFile ? "border-orange-300 bg-orange-50" : "border-stone-200 hover:border-orange-300 hover:bg-orange-50"}`}>
                      <span className="text-xl mb-1">{letterFile ? "✅" : "⬆️"}</span>
                      <span className="text-xs text-stone-600 font-medium break-all">
                        {letterFile ? letterFile.name : "Choisir"}
                      </span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => setLetterFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-400 text-center">PDF ou Word (.doc, .docx)</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setApplyModal(null)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                {applying ? "Envoi…" : "Envoyer ma candidature ✉️"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
