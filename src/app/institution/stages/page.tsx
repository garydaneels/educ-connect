"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface Slot {
  id: string;
  totalPlaces: number;
  availablePlaces: number;
  description?: string;
}

interface Institution {
  id: string;
  name: string;
  subscription?: { status: string; endDate?: string; plan?: string } | null;
  slots: Slot[];
}

function StagesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  const [showSlotForm, setShowSlotForm] = useState(false);
  const [totalPlaces, setTotalPlaces] = useState(1);
  const [slotDesc, setSlotDesc] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);

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

  async function handleAddSlot() {
    if (!institution) return;
    setSavingSlot(true);
    const res = await fetch(`/api/institutions/${institution.id}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalPlaces, description: slotDesc }),
    });
    if (res.ok) {
      const slot = await res.json();
      setInstitution(prev => prev ? { ...prev, slots: [...(prev.slots || []), slot] } : prev);
      setShowSlotForm(false);
      setTotalPlaces(1); setSlotDesc("");
    }
    setSavingSlot(false);
  }

  async function handleDeleteSlot(slotId: string) {
    if (!institution) return;
    if (!confirm("Supprimer cette période de stage ? Les candidatures associées seront également supprimées.")) return;
    const res = await fetch(`/api/institutions/${institution.id}/slots/${slotId}`, { method: "DELETE" });
    if (res.ok) {
      setInstitution(prev => prev ? { ...prev, slots: prev.slots.filter(s => s.id !== slotId) } : prev);
    }
  }

  if (status === "loading" || loading) return null;

  const isActive = institution?.subscription?.status === "ACTIVE";
  const sub = institution?.subscription;
  const fmtShort = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });

  const totalSlots = institution?.slots?.length ?? 0;
  const totalPlacesAvail = institution?.slots?.reduce((a, s) => a + s.availablePlaces, 0) ?? 0;

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/institution" className="text-stone-400 hover:text-stone-700 transition-colors text-sm">
            ← Mon institution
          </Link>
          <span className="text-stone-200">/</span>
          <h1 className="text-xl font-medium text-stone-900">Proposer des stages</h1>
        </div>

        {/* Bannière abonnement */}
        {isActive ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse"></span>
              <div>
                <p className="text-sm font-medium text-green-800">✅ Institution publiée — vos stages sont visibles</p>
                {sub?.endDate && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Abonnement valable jusqu'au <strong>{fmtShort(sub.endDate)}</strong>
                    {new Date(sub.endDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30 && (
                      <span className="ml-2 text-amber-600 font-semibold">⚠️ Expire bientôt</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <Link href="/institution/membership"
              className="text-xs text-green-700 border border-green-300 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
              Gérer l'abonnement
            </Link>
          </div>
        ) : (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl">🔒</div>
            <div>
              <p className="font-medium text-stone-900 text-lg mb-1">Abonnement requis</p>
              <p className="text-sm text-stone-500 max-w-md">
                Activez un abonnement pour créer des périodes de stage et les rendre visibles aux étudiants.
              </p>
            </div>
            <Link href="/institution/membership"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Voir les abonnements →
            </Link>
          </div>
        )}

        {isActive && (
          <>
            {/* Stats rapides */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-3xl font-medium text-orange-500">{totalSlots}</p>
                <p className="text-xs text-stone-500 mt-1">période{totalSlots > 1 ? "s" : ""} de stage</p>
              </div>
              <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-3xl font-medium text-green-600">{totalPlacesAvail}</p>
                <p className="text-xs text-stone-500 mt-1">place{totalPlacesAvail > 1 ? "s" : ""} disponible{totalPlacesAvail > 1 ? "s" : ""}</p>
              </div>
              <div className="hidden sm:block bg-white border border-stone-100 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-3xl font-medium text-sky-500">
                  {institution?.slots?.reduce((a, s) => a + s.totalPlaces, 0) ?? 0}
                </p>
                <p className="text-xs text-stone-500 mt-1">place{((institution?.slots?.reduce((a, s) => a + s.totalPlaces, 0) ?? 0) > 1) ? "s" : ""} au total</p>
              </div>
            </div>

            {/* Section ajout */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-5">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
                <div>
                  <h2 className="font-medium text-stone-900">📅 Périodes de stage</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Définissez les créneaux disponibles pour accueillir des stagiaires</p>
                </div>
                <button onClick={() => setShowSlotForm(!showSlotForm)}
                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors font-medium">
                  {showSlotForm ? "Annuler ▲" : "+ Ajouter une période"}
                </button>
              </div>

              {showSlotForm && (
                <div className="px-6 py-5 bg-orange-50 border-b border-orange-100">
                  <p className="text-sm font-medium text-stone-800 mb-4">Nouvelle période de stage</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Nombre de places *</label>
                      <input type="number" min={1} required value={totalPlaces} onChange={e => setTotalPlaces(+e.target.value)}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Description (optionnel)</label>
                      <input value={slotDesc} onChange={e => setSlotDesc(e.target.value)} placeholder="ex: stage de printemps"
                        className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button type="button" onClick={() => setShowSlotForm(false)}
                      className="border border-stone-200 bg-white text-stone-600 rounded-xl px-5 py-2 text-sm hover:bg-stone-50 transition-colors">
                      Annuler
                    </button>
                    <button type="button" disabled={savingSlot} onClick={handleAddSlot}
                      className="bg-orange-500 text-white rounded-xl px-6 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
                      {savingSlot ? "Ajout…" : "Ajouter une offre de stage"}
                    </button>
                  </div>
                </div>
              )}

              <div className="p-6">
                {(!institution?.slots || institution.slots.length === 0) ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-stone-500 font-medium mb-1">Aucune période de stage définie</p>
                    <p className="text-stone-400 text-sm mb-4">Ajoutez une première période pour commencer à recevoir des candidatures.</p>
                    <button onClick={() => setShowSlotForm(true)}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline">
                      + Créer une période de stage
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {institution.slots.map(slot => (
                      <div key={slot.id} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-medium text-stone-800">
                              {slot.description || "Offre de stage"}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteSlot(slot.id)}
                            className="text-stone-300 hover:text-red-500 hover:bg-red-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                            title="Supprimer">
                            🗑
                          </button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-orange-700 bg-white border border-orange-200 px-2.5 py-1 rounded-full">
                            {slot.availablePlaces}/{slot.totalPlaces} places
                          </span>
                          <span className="text-xs text-stone-400">
                            {slot.totalPlaces - slot.availablePlaces} prise{slot.totalPlaces - slot.availablePlaces > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full transition-all"
                            style={{ width: `${Math.max(0, (slot.availablePlaces / slot.totalPlaces) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function StagesPage() {
  return (
    <Suspense fallback={null}>
      <StagesContent />
    </Suspense>
  );
}
