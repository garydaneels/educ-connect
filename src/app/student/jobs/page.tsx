"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { AdSlot } from "@/components/AdSlot";
import { Pagination } from "@/components/Pagination";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface JobOffer {
  id: string;
  title: string;
  description?: string | null;
  schedule?: string | null;
  salary?: string | null;
  contractType: string;
  createdAt: string;
  institution: {
    id: string;
    name: string;
    commune: string;
    publicTypes: string;
    lat?: number | null;
    lng?: number | null;
  };
}

interface ConfigEntry { key: string; label: string; emoji?: string | null; parentKey?: string | null }
interface AppConfig { SECTOR: ConfigEntry[]; CITY: ConfigEntry[]; COMMUNE: ConfigEntry[] }

const CONTRACT_LABELS: Record<string, string> = {
  ETUDIANT: "Job étudiant",
  CDD: "CDD",
  CDI: "CDI",
  INTERIM: "Intérim",
  BENEVOLE: "Bénévolat",
};

const PAGE_SIZE = 12;

export default function StudentJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [config, setConfig] = useState<AppConfig>({ SECTOR: [], CITY: [], COMMUNE: [] });
  const [city, setCity]     = useState("");
  const [commune, setCommune] = useState("");
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal de candidature
  const [applyModal, setApplyModal] = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyCvPath, setApplyCvPath] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyUploading, setApplyUploading] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "STUDENT") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setConfig).catch(() => {});
  }, []);

  const buildParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams();
    params.set("contractType", "ETUDIANT");
    if (commune) params.set("commune", commune);
    if (sector)  params.set("sector", sector);
    params.set("take", String(PAGE_SIZE));
    params.set("skip", String((pageNum - 1) * PAGE_SIZE));
    return params;
  }, [commune, sector]);

  const search = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setPage(pageNum);
    try {
      const res = await fetch(`/api/jobs?${buildParams(pageNum)}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : (data.jobs ?? []));
      setTotal(Array.isArray(data) ? 0 : (data.total ?? 0));
    } catch {
      setJobs([]);
      setTotal(0);
    }
    setLoading(false);
  }, [buildParams]);

  const checkAppliedJobs = useCallback(async (jobIds: string[]) => {
    if (!session?.user?.id) return;
    const applied = new Set<string>();
    for (const jobId of jobIds) {
      try {
        const res = await fetch(`/api/jobs/apply/check?jobOfferId=${jobId}`);
        const data = await res.json();
        if (data.applied) applied.add(jobId);
      } catch (e) {
        console.error("Erreur vérification:", e);
      }
    }
    setAppliedJobs(applied);
  }, [session?.user?.id]);

  useEffect(() => { search(1); }, [search]);

  useEffect(() => {
    if (jobs.length > 0) {
      checkAppliedJobs(jobs.map(j => j.id));
    }
  }, [jobs, checkAppliedJobs]);

  const handleFileUpload = async (file: File, type: "cv" | "letter") => {
    if (!file) return;
    setApplyUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/jobs/apply/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { path } = await res.json();
        if (type === "cv") setApplyCvPath(path);
      } else {
        alert("❌ Erreur lors de l'upload");
      }
    } catch {
      alert("❌ Erreur de connexion");
    }
    setApplyUploading(false);
  };

  const handleApply = async () => {
    if (!applyName.trim() || !applyEmail.trim() || !applyModal) return;

    setApplySubmitting(true);
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobOfferId: applyModal.jobId,
          name: applyName,
          email: applyEmail,
          phone: applyPhone || null,
          message: applyMessage || null,
          cvPath: applyCvPath || null,
        }),
      });

      if (res.ok) {
        setApplyName("");
        setApplyEmail("");
        setApplyPhone("");
        setApplyMessage("");
        setApplyCvPath("");
        setAppliedJobs(prev => new Set([...prev, applyModal.jobId]));
        setApplyModal(null);
        alert("✅ Candidature envoyée avec succès!");
      } else {
        alert("❌ Erreur lors de l'envoi de la candidature");
      }
    } catch {
      alert("❌ Erreur de connexion");
    }
    setApplySubmitting(false);
  };

  const cityLabel = config.CITY.find(c => c.key === city)?.label ?? city;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">💼 Jobs étudiants</h1>
          <p className="text-stone-800 text-sm">Petits boulots et contrats proposés par les institutions sociales de Belgique francophone</p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-8">
          <p className="text-sm font-medium text-stone-900 mb-4">🔍 Filtrer les offres</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm font-medium text-stone-900 mb-1.5">Ville / Province</label>
              <select
                value={city}
                onChange={e => { setCity(e.target.value); setCommune(""); }}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
              >
                <option value="">Toutes les villes</option>
                {config.CITY.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            <div className={city ? "" : "opacity-30 pointer-events-none"}>
              <label className="block text-sm font-medium text-stone-900 mb-1.5">Commune</label>
              <select
                value={commune}
                onChange={e => setCommune(e.target.value)}
                disabled={!city}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900 disabled:bg-stone-50"
              >
                <option value="">Toutes les communes</option>
                {config.COMMUNE
                  .filter(c => !c.parentKey || c.parentKey.toLowerCase() === city.toLowerCase())
                  .map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-900 mb-1.5">Secteur</label>
              <select
                value={sector}
                onChange={e => setSector(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
              >
                <option value="">Tous les secteurs</option>
                {config.SECTOR.map(s => (
                  <option key={s.key} value={s.key}>{s.emoji ? `${s.emoji} ` : ""}{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(city || commune || sector) && (
            <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-700">Filtres actifs :</span>
              {city && !commune && (
                <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  📍 {cityLabel}
                  <button onClick={() => { setCity(""); setCommune(""); }} className="ml-1">×</button>
                </span>
              )}
              {commune && (
                <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  📍 {commune}
                  <button onClick={() => setCommune("")} className="ml-1">×</button>
                </span>
              )}
              {sector && (
                <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  {config.SECTOR.find(s => s.key === sector)?.emoji ?? ""}{" "}
                  {config.SECTOR.find(s => s.key === sector)?.label ?? sector}
                  <button onClick={() => setSector("")} className="ml-1">×</button>
                </span>
              )}
              <button onClick={() => { setCity(""); setCommune(""); setSector(""); }} className="text-sm text-stone-700 hover:text-orange-600 transition-colors ml-auto">
                Tout effacer ×
              </button>
            </div>
          )}
        </div>

        {/* Publicité */}
        <AdSlot slotId="0987654321" format="horizontal" className="mb-6 min-h-[90px]" />

        {/* Résultats */}
        {loading ? (
          <div className="text-center py-20 text-stone-700">
            <div className="text-4xl mb-3">⏳</div>
            <p>Chargement…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">💼</div>
            <p className="text-stone-900 font-medium mb-1">Aucune offre disponible</p>
            <p className="text-stone-700 text-sm">Les institutions publieront bientôt des jobs étudiants.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-stone-800">
                <span className="font-medium text-stone-900">{total || jobs.length}</span> offre{(total || jobs.length) > 1 ? "s" : ""} disponible{(total || jobs.length) > 1 ? "s" : ""}
              </p>
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

            {viewMode === "map" && (() => {
              const mapped = jobs.filter(j => j.institution.lat && j.institution.lng).map(j => ({
                id: j.id,
                lat: j.institution.lat!,
                lng: j.institution.lng!,
                name: j.institution.name,
                commune: j.institution.commune,
                popupContent: (
                  <div style={{ minWidth: 180 }}>
                    <p style={{ margin: "0 0 1px", fontWeight: 700, fontSize: 14 }}>{j.title}</p>
                    <p style={{ margin: "0 0 4px", color: "#0369a1", fontSize: 12 }}>{j.institution.name}</p>
                    <p style={{ margin: "0 0 8px", color: "#78716c", fontSize: 12 }}>📍 {j.institution.commune}</p>
                    <a href={`/institutions/${j.institution.id}`} style={{ display: "inline-block", background: "#f97316", color: "#fff", padding: "4px 12px", borderRadius: 8, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                      Voir →
                    </a>
                  </div>
                ),
              }));
              return mapped.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-sm text-amber-700 mb-6">
                  Aucune institution géolocalisée pour le moment. Les points apparaîtront automatiquement quand les institutions mettront à jour leur profil.
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-xs text-stone-400 mb-2">{mapped.length} offre{mapped.length > 1 ? "s" : ""} géolocalisée{mapped.length > 1 ? "s" : ""}</p>
                  <MapView markers={mapped} height="500px" />
                </div>
              );
            })()}

            {viewMode === "list" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {jobs.map(job => (
                    <div key={job.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h2 className="text-base font-semibold text-stone-900 leading-tight">{job.title}</h2>
                          <Link href={`/institutions/${job.institution.id}`} className="text-sm text-orange-600 hover:underline font-medium">
                            {job.institution.name}
                          </Link>
                        </div>
                        <span className="shrink-0 text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                          {CONTRACT_LABELS[job.contractType] ?? job.contractType}
                        </span>
                      </div>

                      {job.description && (
                        <p className="text-sm text-stone-800 leading-relaxed mb-3 line-clamp-3">{job.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs bg-orange-50 text-orange-800 border border-orange-100 px-2.5 py-1 rounded-full">
                          📍 {job.institution.commune}
                        </span>
                        {job.schedule && (
                          <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-1 rounded-full">
                            🕐 {job.schedule}
                          </span>
                        )}
                        {job.salary && (
                          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-2.5 py-1 rounded-full">
                            💶 {job.salary}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setApplyModal({ jobId: job.id, jobTitle: job.title })}
                          disabled={appliedJobs.has(job.id)}
                          className={`flex-1 text-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
                            appliedJobs.has(job.id)
                              ? "bg-green-100 text-green-700 cursor-not-allowed border border-green-200"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {appliedJobs.has(job.id) ? "✅ Postulé" : "📮 Postuler"}
                        </button>
                        <Link
                          href={`/institutions/${job.institution.id}`}
                          className="flex-1 text-center bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl py-2.5 text-sm font-medium transition-colors"
                        >
                          Voir →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination currentPage={page} totalPages={totalPages} onPageChange={search} />
              </>
            )}
          </>
        )}

        {/* Modal de candidature */}
        {applyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-1">Postuler à: {applyModal.jobTitle}</h2>
              <p className="text-sm text-stone-600 mb-6">Remplissez le formulaire ci-dessous</p>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Votre nom complet *"
                  value={applyName}
                  onChange={e => setApplyName(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Votre email *"
                  value={applyEmail}
                  onChange={e => setApplyEmail(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={applyPhone}
                  onChange={e => setApplyPhone(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Message ou présentation (optionnel)"
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value)}
                  rows={4}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-2">📄 CV (optionnel)</label>
                    <label className="flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], "cv")}
                        disabled={applyUploading}
                        className="hidden"
                      />
                      {applyCvPath ? "✅ CV uploadé" : "📎 Choisir un fichier"}
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setApplyModal(null)}
                    disabled={applySubmitting}
                    className="flex-1 px-4 py-2 border border-stone-200 text-stone-900 rounded-lg font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={applySubmitting || !applyName.trim() || !applyEmail.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applySubmitting ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
