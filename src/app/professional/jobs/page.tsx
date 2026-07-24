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

export default function ProfessionalJobsPage() {
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
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

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
    if (status === "authenticated" && user?.role !== "PROFESSIONAL") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/professional/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => setProfileExists(!!data))
      .catch(() => setProfileExists(false));
  }, [status]);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setConfig).catch(() => {});
  }, []);

  const buildParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams();
    params.set("contractType", "CDI_CDD");
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-stone-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">💼 Offres d'emploi</h1>
          <p className="text-stone-800 text-sm">CDI, CDD et missions temporaires en Belgique francophone</p>
        </div>

        {/* Profil manquant */}
        {profileExists === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">Complétez votre profil</p>
              <p className="text-sm text-amber-800 mb-3">Vous devez créer un profil professionnel avant de postuler aux offres d'emploi.</p>
              <Link href="/professional/profile" className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg inline-block font-medium">
                → Créer mon profil
              </Link>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-8">
          <p className="text-sm font-medium text-stone-900 mb-4">🔍 Filtrer les offres</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm font-medium text-stone-900 mb-1.5">Ville / Province</label>
              <select
                value={city}
                onChange={e => { setCity(e.target.value); setCommune(""); }}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-stone-900"
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
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-stone-900 disabled:bg-stone-50"
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
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-stone-900"
              >
                <option value="">Tous les secteurs</option>
                {config.SECTOR.map(s => (
                  <option key={s.key} value={s.key}>{s.emoji ? `${s.emoji} ` : ""}{s.label}</option>
                ))}
              </select>
            </div>
          </div>
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
            <p className="text-stone-700 text-sm">Les institutions publieront bientôt des CDI, CDD et missions.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-stone-800">
                <span className="font-medium text-stone-900">{total || jobs.length}</span> offre{(total || jobs.length) > 1 ? "s" : ""} disponible{(total || jobs.length) > 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {jobs.map(job => (
                <div key={job.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-base font-semibold text-stone-900 leading-tight">{job.title}</h2>
                      <Link href={`/institutions/${job.institution.id}`} className="text-sm text-purple-600 hover:underline font-medium">
                        {job.institution.name}
                      </Link>
                    </div>
                    <span className="shrink-0 text-xs bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full font-medium">
                      {CONTRACT_LABELS[job.contractType] ?? job.contractType}
                    </span>
                  </div>

                  {job.description && (
                    <p className="text-sm text-stone-800 leading-relaxed mb-3 line-clamp-3">{job.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs bg-purple-50 text-purple-800 border border-purple-100 px-2.5 py-1 rounded-full">
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
                          : "bg-purple-600 hover:bg-purple-700 text-white"
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
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="email"
                  placeholder="Votre email *"
                  value={applyEmail}
                  onChange={e => setApplyEmail(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={applyPhone}
                  onChange={e => setApplyPhone(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  placeholder="Message ou présentation (optionnel)"
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value)}
                  rows={4}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />

                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-2">📄 CV (optionnel)</label>
                    <label className="flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition-colors">
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
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
