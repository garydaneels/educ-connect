"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string;
}

interface Qualification {
  id: string;
  title: string;
  issuer: string;
  year: string;
  description: string;
}

interface Profile {
  presentation: string | null;
  cvPath: string | null;
  experiences: string;
  qualifications: string;
  sectorPreference: string | null;
  contractType: string | null;
}

function uid() { return Math.random().toString(36).slice(2); }

export default function ProfessionalProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string; name?: string } | undefined;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [presentation, setPresentation] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editExp, setEditExp] = useState<Experience | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expOngoing, setExpOngoing] = useState(false);
  const [expDesc, setExpDesc] = useState("");

  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [showQualForm, setShowQualForm] = useState(false);
  const [editQual, setEditQual] = useState<Qualification | null>(null);
  const [qualTitle, setQualTitle] = useState("");
  const [qualIssuer, setQualIssuer] = useState("");
  const [qualYear, setQualYear] = useState("");
  const [qualDesc, setQualDesc] = useState("");

  const [sectorPreference, setSectorPreference] = useState("");
  const [contractType, setContractType] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "PROFESSIONAL") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/professional/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          setPresentation(data.presentation ?? "");
          setExperiences(JSON.parse(data.experiences ?? "[]"));
          setQualifications(JSON.parse(data.qualifications ?? "[]"));
          setSectorPreference(data.sectorPreference ?? "");
          setContractType(data.contractType ?? "");
        }
        setLoading(false);
      });
  }, [status]);

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/professional/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation, experiences, qualifications, sectorPreference: sectorPreference || null, contractType: contractType || null }),
      });
      setSaving(false);
      if (!res.ok) {
        notify("❌ Erreur lors de la sauvegarde");
        return;
      }
      notify("✅ Profil sauvegardé");
      setTimeout(() => router.push("/professional"), 1500);
    } catch (err) {
      setSaving(false);
      notify("❌ Erreur de connexion");
    }
  }

  function addExp() {
    const newExp: Experience = { id: uid(), title: expTitle, company: expCompany, startDate: expStart, endDate: expEnd, ongoing: expOngoing, description: expDesc };
    setExperiences(editExp ? experiences.map(e => e.id === editExp.id ? newExp : e) : [...experiences, newExp]);
    resetExpForm();
  }

  function resetExpForm() {
    setEditExp(null);
    setExpTitle("");
    setExpCompany("");
    setExpStart("");
    setExpEnd("");
    setExpOngoing(false);
    setExpDesc("");
    setShowExpForm(false);
  }

  function addQual() {
    const newQual: Qualification = { id: uid(), title: qualTitle, issuer: qualIssuer, year: qualYear, description: qualDesc };
    setQualifications(editQual ? qualifications.map(q => q.id === editQual.id ? newQual : q) : [...qualifications, newQual]);
    resetQualForm();
  }

  function resetQualForm() {
    setEditQual(null);
    setQualTitle("");
    setQualIssuer("");
    setQualYear("");
    setQualDesc("");
    setShowQualForm(false);
  }

  if (loading) return <Navbar />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Mon profil professionnel</h1>
              <p className="text-stone-900 mt-1">Complétez votre profil pour postuler aux offres d'emploi</p>
            </div>
            <Link href="/professional/jobs" className="text-sm text-sky-600 hover:text-sky-700 underline">
              → Voir les offres
            </Link>
          </div>

          {/* Présentation */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">📝 Présentation</h2>
            <textarea
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              placeholder="Parlez un peu de vous, vos objectifs de carrière, vos forces..."
              className="w-full h-32 px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-stone-900"
            />
          </div>

          {/* Expériences */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">💼 Expériences professionnelles</h2>
              <button
                onClick={() => setShowExpForm(!showExpForm)}
                className="text-sm bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showExpForm ? "Annuler" : "+ Ajouter"}
              </button>
            </div>

            {showExpForm && (
              <div className="border border-stone-200 rounded-lg p-4 mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Titre du poste"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="month" value={expStart} onChange={(e) => setExpStart(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900" />
                  <input type="month" value={expEnd} onChange={(e) => setExpEnd(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm" disabled={expOngoing} />
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-900">
                  <input type="checkbox" checked={expOngoing} onChange={(e) => setExpOngoing(e.target.checked)} />
                  Toujours en poste
                </label>
                <textarea
                  placeholder="Description des responsabilités"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full h-20 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <button
                  onClick={addExp}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {editExp ? "Mettre à jour" : "Ajouter"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {experiences.map((exp) => (
                <div key={exp.id} className="border border-stone-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">{exp.title}</p>
                      <p className="text-sm text-stone-900">{exp.company}</p>
                      <p className="text-xs text-stone-900 mt-1">{exp.startDate} — {exp.ongoing ? "Actuellement" : exp.endDate}</p>
                      {exp.description && <p className="text-sm text-stone-900 mt-2">{exp.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditExp(exp);
                          setExpTitle(exp.title);
                          setExpCompany(exp.company);
                          setExpStart(exp.startDate);
                          setExpEnd(exp.endDate);
                          setExpOngoing(exp.ongoing);
                          setExpDesc(exp.description);
                          setShowExpForm(true);
                        }}
                        className="text-xs px-2 py-1 border border-stone-200 text-stone-900 rounded hover:bg-stone-50"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setExperiences(experiences.filter(e => e.id !== exp.id))}
                        className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qualifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">🎓 Qualifications & Certifications</h2>
              <button
                onClick={() => setShowQualForm(!showQualForm)}
                className="text-sm bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showQualForm ? "Annuler" : "+ Ajouter"}
              </button>
            </div>

            {showQualForm && (
              <div className="border border-stone-200 rounded-lg p-4 mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Titre de la qualification"
                  value={qualTitle}
                  onChange={(e) => setQualTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <input
                  type="text"
                  placeholder="Organisme de délivrance"
                  value={qualIssuer}
                  onChange={(e) => setQualIssuer(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <input
                  type="text"
                  placeholder="Année (ex: 2023)"
                  value={qualYear}
                  onChange={(e) => setQualYear(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <textarea
                  placeholder="Détails (optionnel)"
                  value={qualDesc}
                  onChange={(e) => setQualDesc(e.target.value)}
                  className="w-full h-20 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-sm text-stone-900"
                />
                <button
                  onClick={addQual}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {editQual ? "Mettre à jour" : "Ajouter"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {qualifications.map((qual) => (
                <div key={qual.id} className="border border-stone-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">{qual.title}</p>
                      <p className="text-sm text-stone-900">{qual.issuer} • {qual.year}</p>
                      {qual.description && <p className="text-sm text-stone-900 mt-2">{qual.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditQual(qual);
                          setQualTitle(qual.title);
                          setQualIssuer(qual.issuer);
                          setQualYear(qual.year);
                          setQualDesc(qual.description);
                          setShowQualForm(true);
                        }}
                        className="text-xs px-2 py-1 border border-stone-200 text-stone-900 rounded hover:bg-stone-50"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setQualifications(qualifications.filter(q => q.id !== qual.id))}
                        className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Préférences */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">🎯 Préférences</h2>
            <div className="grid grid-cols-1 gap-4">
              <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-400 text-stone-900">
                <option value="">Type de contrat</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="INTERIM">Intérim</option>
                <option value="BENEVOLE">Bénévolat</option>
              </select>
            </div>
          </div>

          {/* Bouton Sauvegarder */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "✓ Sauvegarder mon profil"}
            </button>
          </div>

          {toast && <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg">{toast}</div>}
        </div>
      </div>
    </>
  );
}
