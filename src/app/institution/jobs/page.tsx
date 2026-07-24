"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

interface JobOffer {
  id: string;
  title: string;
  description?: string | null;
  schedule?: string | null;
  salary?: string | null;
  contractType: string;
  status: string;
  prerequisites?: string | null;
  createdAt: string;
}

const CONTRACT_TYPES = [
  { key: "ETUDIANT",  label: "Job étudiant" },
  { key: "CDD",       label: "CDD" },
  { key: "CDI",       label: "CDI" },
  { key: "INTERIM",   label: "Intérim" },
  { key: "BENEVOLE",  label: "Bénévolat" },
];

const CONTRACT_LABELS: Record<string, string> = Object.fromEntries(CONTRACT_TYPES.map(c => [c.key, c.label]));

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700 border-green-200",
  INACTIVE: "bg-stone-100 text-stone-500 border-stone-200",
};

const emptyForm = { title: "", description: "", schedule: "", salary: "", contractType: "ETUDIANT", prerequisites: "" };

export default function InstitutionJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [tab, setTab] = useState<"etudiant" | "emploi">("etudiant");
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobsAddonPacks, setJobsAddonPacks] = useState(0);
  const [jobOffersAddonPacks, setJobOffersAddonPacks] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Assume active if authenticated - verify with API but don't block
    setIsActive(true);

    Promise.all([
      fetch("/api/institutions/mine", { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch("/api/institution/jobs", { credentials: "include" }).then(r => r.json()).catch(() => null),
    ]).then(([inst, jobList]) => {
      // Update based on actual subscription status if available
      if (inst?.subscription?.status) {
        setIsActive(inst.subscription.status === "ACTIVE");
        setJobsAddonPacks(inst.subscription.jobsAddonPacks ?? 0);
        setJobOffersAddonPacks(inst.subscription.jobOffersAddonPacks ?? 0);
      }
      if (Array.isArray(jobList)) {
        setJobs(jobList);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [status]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, contractType: tab === "etudiant" ? "ETUDIANT" : "CDI" });
    setError("");
    setShowForm(true);
  }

  function openEdit(job: JobOffer) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      description: job.description ?? "",
      schedule: job.schedule ?? "",
      salary: job.salary ?? "",
      contractType: job.contractType,
      prerequisites: job.prerequisites ?? "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    setError("");
    const url = editingId ? `/api/jobs/${editingId}` : "/api/jobs";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const saved = await res.json();
      if (editingId) {
        setJobs(prev => prev.map(j => j.id === editingId ? { ...j, ...saved } : j));
      } else {
        setJobs(prev => [saved, ...prev]);
      }
      setShowForm(false);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || `Erreur ${res.status}`);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setJobs(prev => prev.filter(j => j.id !== id));
      setDeleteConfirm(null);
    }
  }

  async function toggleStatus(job: JobOffer) {
    const newStatus = job.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
  }

  const filteredJobs = tab === "etudiant"
    ? jobs.filter(j => j.contractType === "ETUDIANT")
    : jobs.filter(j => j.contractType !== "ETUDIANT");

  // Calculer les slots disponibles
  const jobsStudentTotal = jobsAddonPacks * 5;
  const jobsStudentUsed = jobs.filter(j => j.contractType === "ETUDIANT").length;
  const jobsStudentRemaining = jobsStudentTotal - jobsStudentUsed;

  const jobEmploymentTotal = jobOffersAddonPacks * 1;
  const jobEmploymentUsed = jobs.filter(j => j.contractType !== "ETUDIANT").length;
  const jobEmploymentRemaining = jobEmploymentTotal - jobEmploymentUsed;

  if (status === "loading" || loading) return null;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-medium text-stone-900 mb-1">💼 Mes offres d'emploi</h1>
          <p className="text-stone-500 text-sm mb-6">Publiez des offres de jobs étudiants, CDI, CDD, intérim ou bénévolat visibles par les candidats.</p>

          {/* Onglets */}
          <div className="flex gap-2 mb-6 bg-stone-100 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setTab("etudiant")}
              disabled={!isActive}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !isActive
                  ? "text-stone-400 cursor-not-allowed"
                  : tab === "etudiant"
                  ? "bg-white shadow-sm text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}>
              👨‍🎓 Jobs étudiants
              {isActive && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === "etudiant" ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500"}`}>
                  {jobs.filter(j => j.contractType === "ETUDIANT").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("emploi")}
              disabled={!isActive}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !isActive
                  ? "text-stone-400 cursor-not-allowed"
                  : tab === "emploi"
                  ? "bg-white shadow-sm text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}>
              💼 Emplois
              {isActive && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === "emploi" ? "bg-violet-100 text-violet-700" : "bg-stone-200 text-stone-500"}`}>
                  {jobs.filter(j => j.contractType !== "ETUDIANT").length}
                </span>
              )}
            </button>
          </div>

          {/* Slots disponibles */}
          {isActive && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Jobs étudiants</p>
                  <p className="text-2xl font-bold text-emerald-700 mb-1">{jobsStudentRemaining} <span className="text-sm font-normal">slots restants</span></p>
                  <p className="text-xs text-emerald-600">{jobsStudentUsed} utilisés sur {jobsStudentTotal} ({jobsAddonPacks} pack{jobsAddonPacks > 1 ? 's' : ''} × 5)</p>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <p className="text-xs text-sky-600 font-medium mb-1">Offres d'emploi</p>
                  <p className="text-2xl font-bold text-sky-700 mb-1">{jobEmploymentRemaining} <span className="text-sm font-normal">slot{jobEmploymentRemaining !== 1 ? 's' : ''} restant{jobEmploymentRemaining !== 1 ? 's' : ''}</span></p>
                  <p className="text-xs text-sky-600">{jobEmploymentUsed} utilisé{jobEmploymentUsed > 1 ? 's' : ''} sur {jobEmploymentTotal} ({jobOffersAddonPacks} pack{jobOffersAddonPacks > 1 ? 's' : ''} × 1)</p>
                </div>
              </div>
              <button onClick={() => router.push("/institution/membership?tab=addons")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-6">
                📦 Acheter des packs supplémentaires
              </button>
            </>
          )}
        </div>

        {/* Pas d'abonnement actif */}
        {isActive === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-lg font-medium text-stone-900 mb-1">Abonnement requis</p>
            <p className="text-sm text-stone-500 mb-5">
              Activez un abonnement pour publier des offres d'emploi (CDI, CDD, job étudiant…) visibles par les candidats.
            </p>
            <button onClick={() => router.push("/institution/membership")}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Voir les abonnements →
            </button>
          </div>
        )}

        {/* Liste des offres */}
        {isActive && (
          <>
            {filteredJobs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-stone-100">
                <div className="text-5xl mb-4">{tab === "etudiant" ? "👨‍🎓" : "💼"}</div>
                <p className="text-stone-900 font-medium mb-1">Aucune offre publiée</p>
                <p className="text-stone-500 text-sm mb-5">Créez votre première offre {tab === "etudiant" ? "de job étudiant" : "d'emploi"} pour qu'elle apparaisse aux candidats.</p>
                <button onClick={openCreate}
                  className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  + Créer une offre
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map(job => (
                  <div key={job.id} className={`bg-white border rounded-2xl p-5 transition-all ${job.status === "INACTIVE" ? "opacity-60 border-stone-100" : "border-stone-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="font-medium text-stone-900">{job.title}</h2>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[job.status] ?? STATUS_COLORS.INACTIVE}`}>
                            {job.status === "ACTIVE" ? "Visible" : "Masquée"}
                          </span>
                          <span className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
                            {CONTRACT_LABELS[job.contractType] ?? job.contractType}
                          </span>
                        </div>
                        {job.description && <p className="text-sm text-stone-500 line-clamp-2 mb-2">{job.description}</p>}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {job.schedule && (
                            <span className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full">🕐 {job.schedule}</span>
                          )}
                          {job.salary && (
                            <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">💶 {job.salary}</span>
                          )}
                        </div>
                        {job.prerequisites && (
                          <p className="text-xs text-stone-400 italic line-clamp-1">📋 Prérequis : {job.prerequisites}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button onClick={() => toggleStatus(job)}
                          className="text-xs border border-stone-200 text-stone-600 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors">
                          {job.status === "ACTIVE" ? "Masquer" : "Activer"}
                        </button>
                        <button onClick={() => openEdit(job)}
                          className="text-xs border border-stone-200 text-stone-600 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors">
                          Modifier
                        </button>
                        <button onClick={() => setDeleteConfirm(job.id)}
                          className="text-xs border border-red-100 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {deleteConfirm === job.id && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-red-800 mb-3">Supprimer cette offre définitivement ?</p>
                        <div className="flex gap-3">
                          <button onClick={() => setDeleteConfirm(null)}
                            className="flex-1 border border-stone-200 text-stone-600 rounded-lg py-2 text-sm">Annuler</button>
                          <button onClick={() => handleDelete(job.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium">Confirmer</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Bouton créer nouvelle offre si slots disponibles */}
                {(tab === "etudiant" ? jobsStudentRemaining > 0 : jobEmploymentRemaining > 0) && (
                  <div className="mt-6 pt-6 border-t border-stone-100">
                    <button onClick={openCreate}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                      + Créer une nouvelle offre
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Formulaire création / édition */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-stone-100">
                <h2 className="font-medium text-stone-900">{editingId ? "Modifier l'offre" : "Nouvelle offre"}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1.5">Titre <span className="text-red-500">*</span></label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={tab === "etudiant" ? "ex : Éducateur spécialisé étudiant(e)" : "ex : Éducateur spécialisé confirmé(e)"}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1.5">Type de contrat</label>
                  <select value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-900 bg-white">
                    {CONTRACT_TYPES.filter(c => tab === "etudiant" ? c.key === "ETUDIANT" : c.key !== "ETUDIANT").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1.5">Mission demandée</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Décrivez les tâches, le contexte, les responsabilités…"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-900 resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Horaires</label>
                    <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                      placeholder={tab === "etudiant" ? "ex : week-ends, 8h-14h" : "ex : Lun-Ven, 9h-17h"}
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">
                      {tab === "etudiant" ? "Salaire horaire" : "Brut par mois"}
                    </label>
                    <input value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                      placeholder={tab === "etudiant" ? "ex : 10,04 €/h" : "ex : 2500 €"}
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-900" />
                  </div>
                </div>
                {tab === "emploi" && (
                  <div>
                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Prérequis</label>
                    <textarea value={form.prerequisites} onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))}
                      rows={3} placeholder="Décrivez les compétences, diplômes, expériences requises…"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-900 resize-none" />
                  </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <div className="p-6 border-t border-stone-100 flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">Annuler</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                  {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Publier"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
