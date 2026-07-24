"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";

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
  };
}

interface ConfigEntry { key: string; label: string; emoji?: string | null; parentKey?: string | null }
interface AppConfig { SECTOR: ConfigEntry[]; CITY: ConfigEntry[]; COMMUNE: ConfigEntry[] }

const CONTRACT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  ETUDIANT: "Job étudiant",
  INTERIM: "Intérim",
  BENEVOLE: "Bénévolat",
};

const CONTRACT_COLORS: Record<string, string> = {
  CDI:      "bg-violet-100 text-violet-800 border-violet-200",
  CDD:      "bg-indigo-100 text-indigo-800 border-indigo-200",
  ETUDIANT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  INTERIM:  "bg-amber-100 text-amber-800 border-amber-200",
  BENEVOLE: "bg-rose-100 text-rose-800 border-rose-200",
};

const CONTRACT_FILTER_OPTIONS = [
  { key: "CDI_CDD", label: "CDI & CDD" },
  { key: "",         label: "Tous les contrats" },
  { key: "CDI",     label: "CDI" },
  { key: "CDD",     label: "CDD" },
  { key: "ETUDIANT",label: "Job étudiant" },
  { key: "INTERIM", label: "Intérim" },
  { key: "BENEVOLE",label: "Bénévolat" },
];

const emptyForm = { name: "", email: "", phone: "", message: "" };

export default function EmploiClient({ defaultContractTypes }: { defaultContractTypes?: string[] }) {
  const defaultFilter = defaultContractTypes?.length ? "CDI_CDD" : "";
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [config, setConfig] = useState<AppConfig>({ SECTOR: [], CITY: [], COMMUNE: [] });
  const [city, setCity]         = useState("");
  const [commune, setCommune]   = useState("");
  const [sector, setSector]     = useState("");
  const [contractType, setContractType] = useState(defaultFilter);
  const [loading, setLoading] = useState(true);

  // Apply modal
  const [applyJob, setApplyJob] = useState<JobOffer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setConfig).catch(() => {});
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (commune)      params.set("commune", commune);
    if (sector)       params.set("sector", sector);
    if (contractType) params.set("contractType", contractType);
    try {
      const res = await fetch(`/api/jobs?${params}`);
      setJobs(await res.json());
    } catch { setJobs([]); }
    setLoading(false);
  }, [commune, sector, contractType]);

  useEffect(() => { search(); }, [search]);

  const filterLabel = CONTRACT_FILTER_OPTIONS.find(o => o.key === contractType)?.label ?? "";
  const cityLabel = config.CITY.find(c => c.key === city)?.label ?? city;

  function openApply(job: JobOffer) {
    setApplyJob(job);
    setForm(emptyForm);
    setSubmitResult(null);
  }

  async function submitApplication() {
    if (!applyJob || !form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobOfferId: applyJob.id, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ ok: true, msg: "Candidature envoyée ! L'institution vous contactera si votre profil correspond." });
      } else {
        setSubmitResult({ ok: false, msg: data.error || "Erreur lors de l'envoi" });
      }
    } catch {
      setSubmitResult({ ok: false, msg: "Erreur réseau, réessayez" });
    }
    setSubmitting(false);
  }

  return (
    <>
      {/* Modal postuler */}
      {applyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-stone-900">{applyJob.title}</h2>
                  <p className="text-sm text-stone-500 mt-0.5">{applyJob.institution.name} — {applyJob.institution.commune}</p>
                </div>
                <button onClick={() => setApplyJob(null)} className="text-stone-400 hover:text-stone-700 text-xl leading-none mt-0.5">×</button>
              </div>
            </div>

            {submitResult?.ok ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-medium text-stone-900 mb-1">Candidature envoyée !</p>
                <p className="text-sm text-stone-500">{submitResult.msg}</p>
                <button onClick={() => setApplyJob(null)}
                  className="mt-6 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Fermer
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Nom complet <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Prénom Nom"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-stone-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="vous@email.com"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-stone-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Téléphone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+32 XXX XX XX XX"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-stone-900" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Message de motivation</label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={3} placeholder="Décrivez brièvement votre intérêt pour ce poste…"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-stone-900 resize-none" />
                  </div>
                </div>
                {submitResult && !submitResult.ok && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{submitResult.msg}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setApplyJob(null)}
                    className="flex-1 border border-stone-200 text-stone-600 rounded-xl h-11 text-sm hover:bg-stone-50 transition-colors">
                    Annuler
                  </button>
                  <button onClick={submitApplication} disabled={submitting || !form.name.trim() || !form.email.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl h-11 text-sm font-medium transition-colors">
                    {submitting ? "Envoi…" : "Envoyer ma candidature"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
        <p className="text-sm font-medium text-stone-900 mb-4">🔍 Filtrer les offres</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {CONTRACT_FILTER_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setContractType(opt.key)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                contractType === opt.key
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-stone-50 pt-4">
          <div>
            <label className="block text-sm font-medium text-stone-900 mb-1.5">Ville / Province</label>
            <select value={city} onChange={e => { setCity(e.target.value); setCommune(""); }}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-stone-900">
              <option value="">Toutes les villes</option>
              {config.CITY.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          <div className={city ? "" : "opacity-30 pointer-events-none"}>
            <label className="block text-sm font-medium text-stone-900 mb-1.5">Commune</label>
            <select value={commune} onChange={e => setCommune(e.target.value)} disabled={!city}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-stone-900 disabled:bg-stone-50">
              <option value="">Toutes les communes</option>
              {config.COMMUNE
                .filter(c => !c.parentKey || c.parentKey.toLowerCase() === city.toLowerCase())
                .map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-900 mb-1.5">Secteur</label>
            <select value={sector} onChange={e => setSector(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-stone-900">
              <option value="">Tous les secteurs</option>
              {config.SECTOR.map(s => (
                <option key={s.key} value={s.key}>{s.emoji ? `${s.emoji} ` : ""}{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {(city || commune || sector || contractType) && (
          <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-700">Filtres actifs :</span>
            {contractType && (
              <span className="text-xs bg-violet-100 text-violet-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                {filterLabel || CONTRACT_LABELS[contractType]}
                <button onClick={() => setContractType("")} className="ml-1">×</button>
              </span>
            )}
            {city && !commune && (
              <span className="text-xs bg-violet-100 text-violet-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                📍 {cityLabel}
                <button onClick={() => { setCity(""); setCommune(""); }} className="ml-1">×</button>
              </span>
            )}
            {commune && (
              <span className="text-xs bg-violet-100 text-violet-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
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
            <button onClick={() => { setCity(""); setCommune(""); setSector(""); setContractType(""); }}
              className="text-sm text-stone-500 hover:text-violet-600 transition-colors ml-auto">
              Tout effacer ×
            </button>
          </div>
        )}
      </div>

      <AdSlot slotId="1122334466" format="horizontal" className="mb-6 min-h-[90px]" />

      {loading ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-4xl mb-3">⏳</div>
          <p>Chargement…</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-stone-900 font-medium mb-1">Aucune offre pour ces critères</p>
          <p className="text-stone-500 text-sm">Modifiez vos filtres ou revenez plus tard.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-500 mb-5">
            <span className="font-medium text-stone-900">{jobs.length}</span> offre{jobs.length > 1 ? "s" : ""} disponible{jobs.length > 1 ? "s" : ""}
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900 leading-tight mb-1">{job.title}</h2>
                    <Link href={`/institutions/${job.institution.id}`} className="text-sm text-violet-600 hover:underline font-medium">
                      {job.institution.name}
                    </Link>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${CONTRACT_COLORS[job.contractType] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}>
                    {CONTRACT_LABELS[job.contractType] ?? job.contractType}
                  </span>
                </div>

                {job.description && (
                  <p className="text-sm text-stone-700 leading-relaxed mb-3 line-clamp-3">{job.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs bg-stone-50 text-stone-700 border border-stone-100 px-2.5 py-1 rounded-full">
                    📍 {job.institution.commune}
                  </span>
                  {job.schedule && (
                    <span className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full">
                      🕐 {job.schedule}
                    </span>
                  )}
                  {job.salary && (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full">
                      💶 {job.salary}
                    </span>
                  )}
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Link href={`/institutions/${job.institution.id}`}
                    className="text-center border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl py-2.5 text-sm font-medium transition-colors">
                    Voir l'institution
                  </Link>
                  <button onClick={() => openApply(job)}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                    Postuler →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
