"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AdSlot } from "@/components/AdSlot";
import { PUBLIC_TYPES, HEBERGEMENTS, ORGANISMES, SECTEUR_EMOJI } from "@/lib/constants";

interface Slot {
  id: string;
  availablePlaces: number;
  description?: string;
}

interface Institution {
  id: string;
  name: string;
  description?: string;
  address: string;
  commune: string;
  website?: string;
  publicTypes: string;
  hebergements: string;
  organismes: string;
  mission?: string;
  stageDescription?: string;
  supervisorName?: string;
  supervisorTitle?: string;
  teamSize?: string;
  founded?: string;
  slots: Slot[];
}


export default function InstitutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { role?: string } | undefined;

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyModal, setApplyModal] = useState<Slot | null>(null);
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState("");
  const [appliedSlotIds, setAppliedSlotIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/institutions/${params.id}`)
      .then(r => r.json())
      .then(data => { setInstitution(data); setLoading(false); });
  }, [params.id]);

  useEffect(() => {
    fetch("/api/applications")
      .then(r => r.json())
      .then((data: { slotId: string }[]) => {
        if (Array.isArray(data)) setAppliedSlotIds(new Set(data.map(a => a.slotId)));
      })
      .catch(() => {});
  }, []);

  async function handleApply() {
    if (!applyModal || !institution) return;
    setApplying(true);
    fetch(`/api/institutions/${institution.id}/view`, { method: "POST" });
    const fd = new FormData();
    fd.append("slotId", applyModal.id);
    fd.append("institutionId", institution.id);
    if (message) fd.append("message", message);
    if (cvFile) fd.append("cv", cvFile);
    if (letterFile) fd.append("letter", letterFile);
    try {
      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAppliedSlotIds(prev => new Set([...prev, applyModal.id]));
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

  if (loading) return (
    <>
      <Navbar />
      <div className="flex items-center justify-center h-64 text-stone-400">Chargement…</div>
    </>
  );

  if (!institution) return (
    <>
      <Navbar />
      <div className="text-center py-20 text-stone-500">Institution introuvable.</div>
    </>
  );

  const types = JSON.parse(institution.publicTypes) as string[];
  const hebs = JSON.parse(institution.hebergements) as string[];
  const orgs = JSON.parse(institution.organismes) as string[];

  return (
    <>
      <Navbar />

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          ✅ {toast}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-400 mb-6">
          <Link href="/student" className="hover:text-orange-500 transition-colors">← Retour à la recherche</Link>
        </div>

        {/* En-tête */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-50 to-sky-50 px-4 sm:px-8 py-6 sm:py-8 border-b border-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {types.map(t => (
                    <span key={t} className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1 rounded-full font-medium">
                      {SECTEUR_EMOJI[t]} {PUBLIC_TYPES[t]}
                    </span>
                  ))}
                </div>
                <h1 className="text-2xl sm:text-3xl font-medium text-stone-900 mb-2">{institution.name}</h1>
                <p className="text-stone-500 flex items-center gap-1.5 text-sm">
                  📍 {institution.address}, {institution.commune}
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-center justify-center bg-white rounded-2xl border border-stone-100 px-5 py-4 text-center min-w-[100px] flex-shrink-0">
                <p className="text-2xl font-medium text-orange-600">{institution.slots.length}</p>
                <p className="text-xs text-stone-400 mt-0.5">place{institution.slots.length > 1 ? "s" : ""} dispo</p>
              </div>
            </div>
          </div>

          {/* Infos rapides */}
          <div className="px-4 sm:px-8 py-4 flex flex-wrap gap-4 text-sm text-stone-500 border-b border-stone-50">
            {institution.founded && <span>🗓 Fondée en {institution.founded}</span>}
            {institution.teamSize && <span>👥 {institution.teamSize}</span>}
            {institution.website && (
              <a href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sky-600 hover:underline">
                🌐 {institution.website}
              </a>
            )}
            {hebs.map(h => <span key={h} className="text-green-700 bg-green-50 border border-green-100 px-2.5 py-0.5 rounded-full text-xs">{HEBERGEMENTS[h] || h}</span>)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="md:col-span-2 space-y-5">

            {institution.description && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-3">À propos de l'institution</h2>
                <p className="text-stone-600 leading-relaxed">{institution.description}</p>
              </div>
            )}

            {institution.mission && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-3">Notre mission</h2>
                <p className="text-stone-600 leading-relaxed">{institution.mission}</p>
              </div>
            )}

            {institution.stageDescription && (
              <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-3">🎓 Ce que vous vivrez durant votre stage</h2>
                <p className="text-stone-600 leading-relaxed">{institution.stageDescription}</p>
              </div>
            )}

            {institution.supervisorName && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-3">Votre référent de stage</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-200 to-sky-200 flex items-center justify-center text-xl font-medium text-white">
                    {institution.supervisorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">{institution.supervisorName}</p>
                    {institution.supervisorTitle && <p className="text-sm text-stone-500">{institution.supervisorTitle}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne latérale — places */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 sticky top-5">
              <h2 className="text-base font-medium text-stone-900 mb-4">Places de stage disponibles</h2>

              {institution.slots.length === 0 ? (
                <p className="text-sm text-stone-400 italic text-center py-4">Aucune place disponible actuellement.</p>
              ) : (
                <div className="space-y-3">
                  {institution.slots.map(slot => (
                    <div key={slot.id} className="border border-orange-100 bg-orange-50 rounded-xl p-4">
                      {slot.description && <p className="text-sm font-medium text-stone-800 mb-2">{slot.description}</p>}
                      <p className="text-xs text-orange-600 font-medium mb-3">
                        {slot.availablePlaces} place{slot.availablePlaces > 1 ? "s" : ""} disponible{slot.availablePlaces > 1 ? "s" : ""}
                      </p>

                      {user?.role === "STUDENT" ? (
                        appliedSlotIds.has(slot.id) ? (
                          <div className="w-full text-center text-sm text-stone-400 bg-stone-100 border border-stone-200 py-2 rounded-xl font-medium">
                            ✓ Vous avez déjà postulé
                          </div>
                        ) : (
                          <button
                            onClick={() => setApplyModal(slot)}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-xl font-medium transition-colors"
                          >
                            Postuler →
                          </button>
                        )
                      ) : !session ? (
                        <button onClick={() => router.push("/login")}
                          className="w-full bg-stone-700 hover:bg-stone-800 text-white text-sm py-2 rounded-xl font-medium transition-colors">
                          Se connecter pour postuler
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publicité */}
            <AdSlot slotId="5566778899" format="rectangle" className="min-h-[250px]" />
          </div>
        </div>
      </main>

      {/* Modal candidature */}
      {applyModal && (
        <div className="fixed inset-0 bg-stone-800/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">📝</div>
              <h2 className="text-xl font-medium text-stone-900">Envoyer ma candidature</h2>
              <p className="text-sm text-stone-500 mt-1">{institution.name}</p>
              {applyModal.description && (
                <div className="inline-block bg-orange-50 text-orange-700 text-xs px-3 py-1 rounded-full mt-2">
                  {applyModal.description}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Message <span className="text-stone-400 font-normal">(optionnel)</span>
                </label>
                <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none text-stone-900"
                  placeholder="Présentez-vous brièvement…" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "📄 CV", file: cvFile, setFile: setCvFile },
                  { label: "✉️ Lettre", file: letterFile, setFile: setLetterFile },
                ].map(({ label, file, setFile }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">{label} <span className="text-stone-400">(PDF/Word)</span></label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center ${file ? "border-orange-300 bg-orange-50" : "border-stone-200 hover:border-orange-300 hover:bg-orange-50"}`}>
                      <span className="text-2xl mb-1">{file ? "✅" : "⬆️"}</span>
                      <span className="text-xs text-stone-600">{file ? file.name : "Choisir"}</span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setApplyModal(null)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl h-11 text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleApply} disabled={applying}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl h-11 text-sm font-medium transition-colors">
                {applying ? "Envoi…" : "Envoyer ✉️"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
