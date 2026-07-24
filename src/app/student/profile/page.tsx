"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { PUBLIC_TYPES, STUDY_YEARS } from "@/lib/constants";

interface Experience {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string;
}

interface PreviousStage {
  id: string;
  institutionName: string;
  sector: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string;
}

function formatPeriod(startDate: string, endDate: string, ongoing: boolean) {
  const fmt = (d: string) => d ? new Date(d + "-02").toLocaleDateString("fr-BE", { month: "long", year: "numeric" }) : "";
  if (!startDate) return "";
  return `${fmt(startDate)} — ${ongoing ? "En cours" : (endDate ? fmt(endDate) : "?")}`;
}

interface Profile {
  presentation: string | null;
  cvPath: string | null;
  letterPath: string | null;
  experiences: string;
  previousStages: string;
  stageStartDate: string | null;
  stageEndDate: string | null;
  stageMaxHours: number | null;
  conventionPath: string | null;
  studyYear: string | null;
  schoolName: string | null;
  sectorPreference: string | null;
}

function uid() { return Math.random().toString(36).slice(2); }

export default function StudentProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string; name?: string } | undefined;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Présentation
  const [presentation, setPresentation] = useState("");

  // Expériences
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editExp, setEditExp] = useState<Experience | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expOrg, setExpOrg] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expOngoing, setExpOngoing] = useState(false);
  const [expDesc, setExpDesc] = useState("");

  // Stages précédents
  const [stages, setStages] = useState<PreviousStage[]>([]);
  const [showStageForm, setShowStageForm] = useState(false);
  const [editStage, setEditStage] = useState<PreviousStage | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageSector, setStageSector] = useState("");
  const [stageStart, setStageStart] = useState("");
  const [stageEnd, setStageEnd] = useState("");
  const [stageOngoing, setStageOngoing] = useState(false);
  const [stageDesc, setStageDesc] = useState("");

  // Scolarité
  const [studyYear, setStudyYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [sectorPreference, setSectorPreference] = useState("");

  // Stage
  const [stageStartDate, setStageStartDate] = useState("");
  const [stageEndDate, setStageEndDate] = useState("");
  const [stageMaxHours, setStageMaxHours] = useState<number | "">("");

  // Fichiers
  const [cvUploading, setCvUploading] = useState(false);
  const [letterUploading, setLetterUploading] = useState(false);
  const [conventionUploading, setConventionUploading] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLInputElement>(null);
  const conventionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "STUDENT") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/student/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          setPresentation(data.presentation ?? "");
          setExperiences(JSON.parse(data.experiences ?? "[]"));
          setStages(JSON.parse(data.previousStages ?? "[]"));
          setStageStartDate(data.stageStartDate ? data.stageStartDate.slice(0, 10) : "");
          setStageEndDate(data.stageEndDate ? data.stageEndDate.slice(0, 10) : "");
          setStageMaxHours(data.stageMaxHours ?? "");
          setStudyYear(data.studyYear ?? "");
          setSchoolName(data.schoolName ?? "");
          setSectorPreference(data.sectorPreference ?? "");
        }
        setLoading(false);
      });
  }, [status]);

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  async function saveProfile() {
    setSaving(true);
    await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presentation, experiences, previousStages: stages, stageStartDate: stageStartDate || null, stageEndDate: stageEndDate || null, stageMaxHours: stageMaxHours !== "" ? stageMaxHours : null, studyYear: studyYear || null, schoolName: schoolName || null, sectorPreference: sectorPreference || null }),
    });
    setSaving(false);
    notify("✅ Profil sauvegardé");
  }

  async function uploadFile(file: File, type: "cv" | "letter" | "convention") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const res = await fetch("/api/student/profile/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      const field = type === "cv" ? "cvPath" : type === "letter" ? "letterPath" : "conventionPath";
      setProfile(p => p
        ? { ...p, [field]: data.path }
        : { presentation: null, cvPath: null, letterPath: null, conventionPath: null, experiences: "[]", previousStages: "[]", stageStartDate: null, stageEndDate: null, stageMaxHours: null, studyYear: null, schoolName: null, sectorPreference: null, [field]: data.path }
      );
      notify(type === "cv" ? "✅ CV mis à jour" : type === "letter" ? "✅ Lettre de motivation mise à jour" : "✅ Convention de stage mise à jour");
    }
  }

  // ── Expériences
  function openExpForm(exp?: Experience) {
    if (exp) {
      setEditExp(exp); setExpTitle(exp.title); setExpOrg(exp.organization);
      setExpStart(exp.startDate ?? ""); setExpEnd(exp.endDate ?? ""); setExpOngoing(exp.ongoing ?? false);
      setExpDesc(exp.description);
    } else {
      setEditExp(null); setExpTitle(""); setExpOrg(""); setExpStart(""); setExpEnd(""); setExpOngoing(false); setExpDesc("");
    }
    setShowExpForm(true);
  }

  function saveExp() {
    const entry: Experience = { id: editExp?.id ?? uid(), title: expTitle, organization: expOrg, startDate: expStart, endDate: expEnd, ongoing: expOngoing, description: expDesc };
    if (editExp) setExperiences(prev => prev.map(e => e.id === editExp.id ? entry : e));
    else setExperiences(prev => [...prev, entry]);
    setShowExpForm(false);
  }

  // ── Stages précédents
  function openStageForm(s?: PreviousStage) {
    if (s) {
      setEditStage(s); setStageName(s.institutionName); setStageSector(s.sector);
      setStageStart(s.startDate ?? ""); setStageEnd(s.endDate ?? ""); setStageOngoing(s.ongoing ?? false);
      setStageDesc(s.description);
    } else {
      setEditStage(null); setStageName(""); setStageSector(""); setStageStart(""); setStageEnd(""); setStageOngoing(false); setStageDesc("");
    }
    setShowStageForm(true);
  }

  function saveStage() {
    const entry: PreviousStage = { id: editStage?.id ?? uid(), institutionName: stageName, sector: stageSector, startDate: stageStart, endDate: stageEnd, ongoing: stageOngoing, description: stageDesc };
    if (editStage) setStages(prev => prev.map(s => s.id === editStage.id ? entry : s));
    else setStages(prev => [...prev, entry]);
    setShowStageForm(false);
  }

  if (status === "loading" || loading) return null;

  return (
    <>
      <Navbar />

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-6">

        {/* En-tête */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">Mon profil</h1>
            <p className="text-stone-800 text-sm mt-0.5">{user?.name}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/student" className="text-sm text-stone-700 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 px-5 py-2.5 rounded-xl font-medium transition-colors">← Retour</Link>
            <button onClick={saveProfile} disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {saving ? "Enregistrement…" : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* Présentation */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-50">
            <h2 className="font-medium text-stone-900">👤 Présentation</h2>
            <p className="text-xs text-stone-800 mt-0.5">Décrivez qui vous êtes, vos motivations et ce que vous recherchez</p>
          </div>
          <div className="p-6">
            <textarea
              value={presentation}
              onChange={e => setPresentation(e.target.value)}
              rows={5}
              placeholder="Ex : Étudiant(e) en 2ème année de bachelier en travail social, je suis motivé(e) par l'accompagnement des personnes en situation de vulnérabilité…"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Scolarité */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-50">
            <h2 className="font-medium text-stone-900">🎓 Ma scolarité</h2>
            <p className="text-xs text-stone-800 mt-0.5">Ces informations permettent aux institutions de vous trouver</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Année d'étude</label>
              <select
                value={studyYear}
                onChange={e => setStudyYear(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">— Choisir —</option>
                <optgroup label="Secondaire">
                  <option value="SEC_4">4ème Secondaire</option>
                  <option value="SEC_5">5ème Secondaire</option>
                  <option value="SEC_6">6ème Secondaire</option>
                </optgroup>
                <optgroup label="Haute École">
                  <option value="HE_1">1ère Haute École</option>
                  <option value="HE_2">2ème Haute École</option>
                  <option value="HE_3">3ème Haute École</option>
                </optgroup>
                <optgroup label="Master">
                  <option value="MASTER_1">1ère Master</option>
                  <option value="MASTER_2">2ème Master</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Mon école</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="Ex : EPHEC, HELMo, HELB…"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Secteur de stage préféré</label>
              <select
                value={sectorPreference}
                onChange={e => setSectorPreference(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">— Choisir —</option>
                {Object.entries(PUBLIC_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informations de stage */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-50">
            <h2 className="font-medium text-stone-900">📅 Mon stage</h2>
            <p className="text-xs text-stone-800 mt-0.5">Dates et informations de votre stage en cours ou à venir</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Date de début</label>
                <input
                  type="date"
                  value={stageStartDate}
                  onChange={e => setStageStartDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Date de fin</label>
                <input
                  type="date"
                  value={stageEndDate}
                  onChange={e => setStageEndDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Nombre d'heures maximum</label>
                <input
                  type="number"
                  min={0}
                  value={stageMaxHours}
                  onChange={e => setStageMaxHours(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="ex: 500"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>

            {/* Convention de stage */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-2">Convention de stage (PDF)</label>
              <div className="border-2 border-dashed border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 hover:border-orange-300 transition-colors">
                <div className="text-3xl">📋</div>
                <div className="flex-1 text-center sm:text-left">
                  {profile?.conventionPath ? (
                    <>
                      <a href={profile.conventionPath} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-orange-600 hover:underline">
                        Voir la convention actuelle →
                      </a>
                      <p className="text-xs text-stone-400 mt-0.5">Cliquez sur le bouton pour remplacer</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-stone-800">Aucune convention déposée</p>
                      <p className="text-xs text-stone-400 mt-0.5">Fichier PDF uniquement</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  ref={conventionRef}
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setConventionUploading(true);
                    await uploadFile(file, "convention");
                    setConventionUploading(false);
                    if (conventionRef.current) conventionRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={conventionUploading}
                  onClick={() => conventionRef.current?.click()}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-50 flex-shrink-0"
                >
                  {conventionUploading ? "Envoi…" : profile?.conventionPath ? "Remplacer" : "Déposer"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-50">
            <h2 className="font-medium text-stone-900">📄 Documents</h2>
            <p className="text-xs text-stone-800 mt-0.5">Ces documents seront pré-remplis lors de vos candidatures</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* CV */}
            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-orange-300 transition-colors">
              <div className="text-3xl">📋</div>
              <div className="text-center">
                <p className="text-sm font-medium text-stone-800">Curriculum Vitae</p>
                {profile?.cvPath ? (
                  <a href={profile.cvPath} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline mt-0.5 block">
                    Voir le CV actuel →
                  </a>
                ) : (
                  <p className="text-xs text-stone-800 mt-0.5">Aucun CV déposé</p>
                )}
              </div>
              <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setCvUploading(true); await uploadFile(f, "cv"); setCvUploading(false);
                }} />
              <button onClick={() => cvRef.current?.click()} disabled={cvUploading}
                className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 font-medium">
                {cvUploading ? "Envoi…" : profile?.cvPath ? "Remplacer" : "Déposer mon CV"}
              </button>
            </div>

            {/* Lettre */}
            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-orange-300 transition-colors">
              <div className="text-3xl">✉️</div>
              <div className="text-center">
                <p className="text-sm font-medium text-stone-800">Lettre de motivation</p>
                {profile?.letterPath ? (
                  <a href={profile.letterPath} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline mt-0.5 block">
                    Voir la lettre actuelle →
                  </a>
                ) : (
                  <p className="text-xs text-stone-800 mt-0.5">Aucune lettre déposée</p>
                )}
              </div>
              <input ref={letterRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setLetterUploading(true); await uploadFile(f, "letter"); setLetterUploading(false);
                }} />
              <button onClick={() => letterRef.current?.click()} disabled={letterUploading}
                className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 font-medium">
                {letterUploading ? "Envoi…" : profile?.letterPath ? "Remplacer" : "Déposer ma lettre"}
              </button>
            </div>
          </div>
        </div>

        {/* Expériences + Stages côte à côte */}
        <div className="grid lg:grid-cols-2 gap-6">

        {/* Expériences */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
            <div>
              <h2 className="font-medium text-stone-900">💼 Expériences professionnelles</h2>
              <p className="text-xs text-stone-800 mt-0.5">Jobs étudiants, bénévolat, associations…</p>
            </div>
            <button onClick={() => openExpForm()}
              className="text-xs text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
              + Ajouter
            </button>
          </div>

          {showExpForm && (
            <div className="px-6 py-5 bg-orange-50 border-b border-orange-100 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Poste / Fonction *</label>
                  <input value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="Animateur, bénévole…"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Organisation *</label>
                  <input value={expOrg} onChange={e => setExpOrg(e.target.value)} placeholder="Nom de l'organisation"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Date de début</label>
                  <input type="date" value={expStart} onChange={e => setExpStart(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Date de fin</label>
                  <input type="date" value={expEnd} onChange={e => setExpEnd(e.target.value)} disabled={expOngoing}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900 disabled:opacity-40 disabled:bg-stone-50" />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={expOngoing} onChange={e => setExpOngoing(e.target.checked)} className="rounded" />
                    <span className="text-xs text-stone-900 font-medium">En cours</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-800 mb-1">Description</label>
                  <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Courte description (optionnel)"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowExpForm(false)}
                  className="flex-1 border border-stone-200 text-stone-900 rounded-xl py-2 text-sm hover:bg-white transition-colors">Annuler</button>
                <button onClick={saveExp} disabled={!expTitle || !expOrg}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
                  {editExp ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {experiences.length === 0 ? (
              <p className="text-sm text-stone-800 italic text-center py-4">Aucune expérience ajoutée.</p>
            ) : (
              <div className="space-y-3">
                {experiences.map(exp => (
                  <div key={exp.id} className="flex items-start justify-between gap-4 p-4 bg-stone-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{exp.title}</p>
                      <p className="text-sm text-stone-900">{exp.organization}</p>
                      {exp.startDate && <p className="text-xs text-stone-800 mt-0.5">{formatPeriod(exp.startDate, exp.endDate, exp.ongoing)}</p>}
                      {exp.description && <p className="text-xs text-stone-800 mt-1">{exp.description}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openExpForm(exp)}
                        className="text-xs text-stone-800 hover:text-stone-800 px-2 py-1 rounded-lg hover:bg-stone-200 transition-colors">✏️</button>
                      <button onClick={() => setExperiences(prev => prev.filter(e => e.id !== exp.id))}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stages précédents */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden self-start">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
            <div>
              <h2 className="font-medium text-stone-900">🎓 Stages précédents</h2>
              <p className="text-xs text-stone-800 mt-0.5">Si ce n'est pas votre premier stage en secteur social</p>
            </div>
            <button onClick={() => openStageForm()}
              className="text-xs text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
              + Ajouter
            </button>
          </div>

          {showStageForm && (
            <div className="px-6 py-5 bg-orange-50 border-b border-orange-100 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Nom de l'institution *</label>
                  <input value={stageName} onChange={e => setStageName(e.target.value)} placeholder="CPAS de Namur, MECS…"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Secteur</label>
                  <select value={stageSector} onChange={e => setStageSector(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900">
                    <option value="">Choisir un secteur…</option>
                    {Object.entries(PUBLIC_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Date de début</label>
                  <input type="date" value={stageStart} onChange={e => setStageStart(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-800 mb-1">Date de fin</label>
                  <input type="date" value={stageEnd} onChange={e => setStageEnd(e.target.value)} disabled={stageOngoing}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900 disabled:opacity-40 disabled:bg-stone-50" />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={stageOngoing} onChange={e => setStageOngoing(e.target.checked)} className="rounded" />
                    <span className="text-xs text-stone-900 font-medium">En cours</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-800 mb-1">Description</label>
                  <input value={stageDesc} onChange={e => setStageDesc(e.target.value)} placeholder="Ce que vous avez appris…"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowStageForm(false)}
                  className="flex-1 border border-stone-200 text-stone-900 rounded-xl py-2 text-sm hover:bg-white transition-colors">Annuler</button>
                <button onClick={saveStage} disabled={!stageName}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
                  {editStage ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {stages.length === 0 ? (
              <p className="text-sm text-stone-800 italic text-center py-4">Aucun stage précédent ajouté.</p>
            ) : (
              <div className="space-y-3">
                {stages.map(s => (
                  <div key={s.id} className="flex items-start justify-between gap-4 p-4 bg-stone-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{s.institutionName}</p>
                      {s.sector && (
                        <span className="inline-block text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full mt-0.5">
                          {PUBLIC_TYPES[s.sector] || s.sector}
                        </span>
                      )}
                      {s.startDate && <p className="text-xs text-stone-800 mt-1">{formatPeriod(s.startDate, s.endDate, s.ongoing)}</p>}
                      {s.description && <p className="text-xs text-stone-800 mt-1">{s.description}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openStageForm(s)}
                        className="text-xs text-stone-800 hover:text-stone-800 px-2 py-1 rounded-lg hover:bg-stone-200 transition-colors">✏️</button>
                      <button onClick={() => setStages(prev => prev.filter(x => x.id !== s.id))}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        </div>{/* fin grid lg:grid-cols-2 */}

        {/* Bouton save bas de page */}
        <div className="flex justify-end pb-4">
          <button onClick={saveProfile} disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-medium transition-colors">
            {saving ? "Enregistrement…" : "Sauvegarder le profil"}
          </button>
        </div>

      </main>
    </>
  );
}
