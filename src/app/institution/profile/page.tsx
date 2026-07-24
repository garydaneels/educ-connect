"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { COMMUNES_BRUXELLES, PUBLIC_TYPES, HEBERGEMENTS, ORGANISMES } from "@/lib/constants";

interface Institution {
  id: string;
  name: string;
  commune: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  mission?: string;
  stageDescription?: string;
  supervisorName?: string;
  supervisorTitle?: string;
  teamSize?: string;
  founded?: string;
  publicTypes: string;
  hebergements: string;
  organismes: string;
  subscription?: { status: string } | null;
}

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<"infos" | "mission" | "stage" | "secteurs" | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [commune, setCommune] = useState(COMMUNES_BRUXELLES[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [publicTypes, setPublicTypes] = useState<string[]>([]);
  const [hebergements, setHebergements] = useState<string[]>([]);
  const [organismes, setOrganismes] = useState<string[]>([]);
  const [mission, setMission] = useState("");
  const [stageDescription, setStageDescription] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorTitle, setSupervisorTitle] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [founded, setFounded] = useState("");

  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/institutions/mine", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setInstitution(data); if (data) populate(data); setLoading(false); });
  }, [status]);

  function populate(data: Institution) {
    setName(data.name ?? "");
    setDescription(data.description ?? "");
    setAddress(data.address ?? "");
    setCommune(data.commune ?? COMMUNES_BRUXELLES[0]);
    setPhone(data.phone ?? "");
    setEmail(data.email ?? "");
    setWebsite(data.website ?? "");
    setPublicTypes(JSON.parse(data.publicTypes) ?? []);
    setHebergements(JSON.parse(data.hebergements) ?? []);
    setOrganismes(JSON.parse(data.organismes) ?? []);
    setMission(data.mission ?? "");
    setStageDescription(data.stageDescription ?? "");
    setSupervisorName(data.supervisorName ?? "");
    setSupervisorTitle(data.supervisorTitle ?? "");
    setTeamSize(data.teamSize ?? "");
    setFounded(data.founded ?? "");
  }

  function toggleMulti(value: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  }

  async function handleSave() {
    if (!institution) return;
    setSaving(true);
    const res = await fetch(`/api/institutions/${institution.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, address, commune, phone, email, website, publicTypes, hebergements, organismes, mission, stageDescription, supervisorName, supervisorTitle, teamSize, founded }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInstitution(prev => prev ? { ...prev, ...updated } : prev);
      setEditSection(null);
    }
    setSaving(false);
  }

  async function handleChangeCode() {
    if (newCode !== confirmCode) { setCodeMsg({ type: "err", text: "Les codes ne correspondent pas" }); return; }
    if (newCode.length < 6) { setCodeMsg({ type: "err", text: "Le nouveau code doit faire au moins 6 caractères" }); return; }
    setCodeLoading(true);
    setCodeMsg(null);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentCode, newPassword: newCode }),
    });
    if (res.ok) {
      setCodeMsg({ type: "ok", text: "Code mis à jour avec succès" });
      setCurrentCode(""); setNewCode(""); setConfirmCode("");
    } else {
      const err = await res.json();
      setCodeMsg({ type: "err", text: err.error || "Erreur" });
    }
    setCodeLoading(false);
  }

  if (status === "loading" || loading) return null;

  const types = institution ? JSON.parse(institution.publicTypes) as string[] : [];
  const hebs  = institution ? JSON.parse(institution.hebergements) as string[] : [];
  const orgs  = institution ? JSON.parse(institution.organismes) as string[] : [];

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/institution" className="text-stone-400 hover:text-stone-700 transition-colors text-sm">
            ← Mon institution
          </Link>
          <span className="text-stone-200">/</span>
          <h1 className="text-xl font-medium text-stone-900">Mon profil</h1>
        </div>

        <div className="space-y-5">

          {/* ── Mission & Description ── */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
              <div>
                <h2 className="font-medium text-stone-900">🏛️ Notre institution</h2>
                <p className="text-xs text-stone-400 mt-0.5">Description générale et mission — visible sur votre fiche publique</p>
              </div>
              {editSection !== "mission" && (
                <button onClick={() => { if (institution) populate(institution); setEditSection("mission"); }}
                  className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                  Modifier
                </button>
              )}
            </div>

            {editSection === "mission" ? (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Description de l'institution</label>
                  <p className="text-xs text-stone-400 mb-2">Présentez votre institution en quelques phrases — ce texte apparaît sur les cartes de recherche.</p>
                  <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Ex : Le Centre Le Phare accompagne des adultes avec un trouble du spectre autistique en milieu résidentiel…"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Notre mission</label>
                  <p className="text-xs text-stone-400 mb-2">Les valeurs et l'engagement de votre institution — ce texte apparaît sur votre fiche détaillée.</p>
                  <textarea rows={5} value={mission} onChange={e => setMission(e.target.value)}
                    placeholder="Ex : Notre mission est de favoriser l'inclusion sociale et l'autonomie des personnes que nous accompagnons…"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none leading-relaxed" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setEditSection(null)}
                    className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">Annuler</button>
                  <button type="button" disabled={saving} onClick={handleSave}
                    className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">
                    {saving ? "Enregistrement…" : "Sauvegarder"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-50">
                <div className="p-6">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Description</p>
                  {institution?.description ? (
                    <p className="text-stone-700 leading-relaxed text-sm">{institution.description}</p>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-stone-300 text-sm italic">Aucune description renseignée.</p>
                      <button onClick={() => { if (institution) populate(institution); setEditSection("mission"); }}
                        className="text-xs text-sky-500 hover:text-sky-700 hover:underline transition-colors">+ Ajouter une description</button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Mission</p>
                  {institution?.mission ? (
                    <p className="text-stone-700 leading-relaxed text-sm">{institution.mission}</p>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-stone-300 text-sm italic">Aucune mission renseignée.</p>
                      <button onClick={() => { if (institution) populate(institution); setEditSection("mission"); }}
                        className="text-xs text-sky-500 hover:text-sky-700 hover:underline transition-colors">+ Ajouter votre mission</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid xl:grid-cols-2 gap-5">

            {/* ── Informations générales ── */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
                <h2 className="font-medium text-stone-900">📋 Informations générales</h2>
                {editSection !== "infos" && (
                  <button onClick={() => { if (institution) populate(institution); setEditSection("infos"); }}
                    className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors font-medium">Modifier</button>
                )}
              </div>

              {editSection === "infos" ? (
                <div className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Nom *</label>
                      <input required value={name} onChange={e => setName(e.target.value)}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Commune *</label>
                      <select required value={commune} onChange={e => setCommune(e.target.value)}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300">
                        {COMMUNES_BRUXELLES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Adresse *</label>
                      <input required value={address} onChange={e => setAddress(e.target.value)}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Téléphone</label>
                      <input value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Site web</label>
                      <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.exemple.be"
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Fondée en</label>
                      <input value={founded} onChange={e => setFounded(e.target.value)} placeholder="ex: 1998"
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Taille de l'équipe</label>
                      <input value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="ex: 12 personnes"
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditSection(null)}
                      className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">Annuler</button>
                    <button type="button" disabled={saving} onClick={handleSave}
                      className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">
                      {saving ? "Enregistrement…" : "Sauvegarder"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-3">
                  {institution ? (
                    <>
                      {[
                        { label: "Nom", value: institution.name },
                        { label: "Adresse", value: `${institution.address}, ${institution.commune}` },
                        { label: "Téléphone", value: institution.phone },
                        { label: "Site web", value: institution.website },
                        { label: "Fondée en", value: institution.founded },
                        { label: "Équipe", value: institution.teamSize },
                      ].filter(r => r.value).map(row => (
                        <div key={row.label} className="flex gap-3 text-sm">
                          <span className="text-stone-400 w-24 flex-shrink-0">{row.label}</span>
                          <span className="text-stone-800">{row.value}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-stone-400 text-sm italic">Aucune information renseignée.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Secteurs & filtres ── */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
                <div>
                  <h2 className="font-medium text-stone-900">🏷️ Secteurs & filtres</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Ces informations servent aux étudiants pour filtrer les recherches</p>
                </div>
                {editSection !== "secteurs" && (
                  <button onClick={() => { if (institution) populate(institution); setEditSection("secteurs"); }}
                    className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors font-medium">Modifier</button>
                )}
              </div>

              {editSection === "secteurs" ? (
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Secteurs d'activité</label>
                    <p className="text-xs text-stone-400 mb-2.5">Sélectionnez tous les types d'établissements qui vous correspondent</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PUBLIC_TYPES).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => toggleMulti(k, publicTypes, setPublicTypes)}
                          className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${publicTypes.includes(k) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Public accompagné</label>
                    <p className="text-xs text-stone-400 mb-2.5">Quel type de public accueillez-vous ?</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(HEBERGEMENTS).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => toggleMulti(k, hebergements, setHebergements)}
                          className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${hebergements.includes(k) ? "border-green-500 bg-green-50 text-green-700" : "border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Organisme de tutelle</label>
                    <p className="text-xs text-stone-400 mb-2.5">Sous quelle autorité fonctionne votre institution ?</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ORGANISMES).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => toggleMulti(k, organismes, setOrganismes)}
                          className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${organismes.includes(k) ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditSection(null)}
                      className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">Annuler</button>
                    <button type="button" disabled={saving} onClick={handleSave}
                      className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">
                      {saving ? "Enregistrement…" : "Sauvegarder"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {types.length === 0 && hebs.length === 0 && orgs.length === 0 ? (
                    <p className="text-sm text-stone-400 italic">Aucun secteur sélectionné — cliquez "Modifier" pour en ajouter.</p>
                  ) : (
                    <div className="space-y-4">
                      {types.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-stone-400 mb-2">Secteurs d'activité</p>
                          <div className="flex flex-wrap gap-1.5">
                            {types.map(t => <span key={t} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full">{PUBLIC_TYPES[t]}</span>)}
                          </div>
                        </div>
                      )}
                      {hebs.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-stone-400 mb-2">Public accompagné</p>
                          <div className="flex flex-wrap gap-1.5">
                            {hebs.map(h => <span key={h} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full">{HEBERGEMENTS[h]}</span>)}
                          </div>
                        </div>
                      )}
                      {orgs.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-stone-400 mb-2">Organisme de tutelle</p>
                          <div className="flex flex-wrap gap-1.5">
                            {orgs.map(o => <span key={o} className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full">{ORGANISMES[o]}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Stage & équipe ── */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
                <h2 className="font-medium text-stone-900">🎓 Stage & équipe</h2>
                {editSection !== "stage" && (
                  <button onClick={() => { if (institution) populate(institution); setEditSection("stage"); }}
                    className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors font-medium">Modifier</button>
                )}
              </div>

              {editSection === "stage" ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Mission du stagiaire</label>
                    <textarea rows={3} value={mission} onChange={e => setMission(e.target.value)}
                      placeholder="Décrivez les missions confiées au stagiaire au quotidien…"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Ce que vivra le/la stagiaire</label>
                    <textarea rows={4} value={stageDescription} onChange={e => setStageDescription(e.target.value)}
                      placeholder="Décrivez le contenu du stage, les missions confiées, le quotidien…"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Nom du référent</label>
                      <input value={supervisorName} onChange={e => setSupervisorName(e.target.value)} placeholder="ex: Marie Dupont"
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1.5">Fonction</label>
                      <input value={supervisorTitle} onChange={e => setSupervisorTitle(e.target.value)} placeholder="ex: Coordinatrice"
                        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditSection(null)}
                      className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">Annuler</button>
                    <button type="button" disabled={saving} onClick={handleSave}
                      className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">
                      {saving ? "Enregistrement…" : "Sauvegarder"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {institution?.mission ? (
                    <>
                      <div>
                        <p className="text-xs text-stone-400 mb-1">Mission du stagiaire</p>
                        <p className="text-sm text-stone-700 leading-relaxed">{institution.mission}</p>
                      </div>
                      {institution.stageDescription && (
                        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                          <p className="text-xs text-orange-600 font-medium mb-1">Ce que vivra le/la stagiaire</p>
                          <p className="text-sm text-stone-700 leading-relaxed">{institution.stageDescription}</p>
                        </div>
                      )}
                      {institution.supervisorName && (
                        <div className="flex items-center gap-3 pt-2 border-t border-stone-50">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-300 to-sky-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                            {institution.supervisorName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">{institution.supervisorName}</p>
                            {institution.supervisorTitle && <p className="text-xs text-stone-500">{institution.supervisorTitle}</p>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-stone-400 text-sm italic mb-3">Aucune description du stage ajoutée.</p>
                      <button onClick={() => { if (institution) populate(institution); setEditSection("stage"); }}
                        className="text-xs text-sky-600 hover:underline">+ Ajouter une description</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Code d'accès ── */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-50">
                <h2 className="font-medium text-stone-900">🔑 Code d'accès</h2>
                <p className="text-xs text-stone-400 mt-0.5">Modifiez votre code de connexion à l'espace institution</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Code actuel</label>
                  <input type="password" value={currentCode} onChange={e => setCurrentCode(e.target.value)}
                    placeholder="••••••"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Nouveau code</label>
                    <input type="password" value={newCode} onChange={e => setNewCode(e.target.value)}
                      placeholder="min. 6 caractères"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Confirmer le nouveau code</label>
                    <input type="password" value={confirmCode} onChange={e => setConfirmCode(e.target.value)}
                      placeholder="••••••"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  </div>
                </div>
                {codeMsg && (
                  <div className={`text-sm px-4 py-3 rounded-xl ${codeMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {codeMsg.type === "ok" ? "✓ " : "✗ "}{codeMsg.text}
                  </div>
                )}
                <div className="flex justify-end">
                  <button type="button" disabled={codeLoading || !currentCode || !newCode || !confirmCode}
                    onClick={handleChangeCode}
                    className="bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    {codeLoading ? "Mise à jour…" : "Changer le code"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}
