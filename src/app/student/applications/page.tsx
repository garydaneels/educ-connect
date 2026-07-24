"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface MyProfile {
  stageStartDate?: string | null;
  stageEndDate?: string | null;
  stageMaxHours?: number | null;
  conventionPath?: string | null;
}

interface Application {
  id: string;
  status: string;
  stageStatus?: string;
  message?: string;
  cvPath?: string;
  letterPath?: string;
  appointmentDate?: string;
  appointmentNote?: string;
  createdAt: string;
  institution: { id: string; name: string; address: string; commune: string };
  slot: { description?: string } | null;
}

interface Message {
  id: string;
  content: string;
  type: string;
  proposedDate?: string;
  proposedNote?: string;
  createdAt: string;
  sender: { id: string; name?: string; role: string };
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  INVITED:  { label: "Invitation",  bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-400" },
  PENDING:  { label: "En attente",  bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  ACCEPTED: { label: "Acceptée",    bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400" },
  REJECTED: { label: "Refusée",     bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
};

export default function StudentApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showRdvForm, setShowRdvForm] = useState(false);
  const [rdvDate, setRdvDate] = useState("");
  const [rdvNote, setRdvNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [interestedInMe, setInterestedInMe] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "STUDENT") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/applications").then(r => r.json()).then(data => {
      setApplications(data);
      setLoading(false);
    });
    fetch("/api/student/profile").then(r => r.ok ? r.json() : null).then(data => {
      if (data) setMyProfile(data);
    });
    fetch("/api/student/interests")
      .then(r => r.ok ? r.json() : [])
      .then((ids: string[]) => setInterestedInMe(new Set(ids)))
      .catch(() => {});
  }, [status]);

  const fetchMessages = useCallback(async (appId: string) => {
    const res = await fetch(`/api/messages/${appId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selected) return;
    fetchMessages(selected.id);
    pollRef.current = setInterval(() => fetchMessages(selected.id), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, fetchMessages]);

  async function sendMessage() {
    if (!newMsg.trim() || !selected) return;
    setSending(true);
    await fetch(`/api/messages/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    });
    setNewMsg("");
    await fetchMessages(selected.id);
    setSending(false);
  }

  async function sendProposal() {
    if (!selected || !rdvDate) return;
    setSending(true);
    const content = `Proposition de rendez-vous : ${fmtDt(rdvDate)}${rdvNote ? ` — ${rdvNote}` : ""}`;
    await fetch(`/api/messages/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type: "APPOINTMENT_PROPOSAL", proposedDate: rdvDate, proposedNote: rdvNote }),
    });
    setShowRdvForm(false);
    setRdvDate("");
    setRdvNote("");
    await fetchMessages(selected.id);
    setSending(false);
  }

  async function acceptProposal(msg: Message) {
    if (!selected || !msg.proposedDate) return;
    setSending(true);
    await fetch(`/api/applications/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentDate: msg.proposedDate, appointmentNote: msg.proposedNote }),
    });
    const content = `✅ Rendez-vous confirmé : ${fmtDt(msg.proposedDate)}${msg.proposedNote ? ` — ${msg.proposedNote}` : ""}`;
    await fetch(`/api/messages/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type: "APPOINTMENT" }),
    });
    const updated = { ...selected, status: "ACCEPTED", appointmentDate: msg.proposedDate, appointmentNote: msg.proposedNote || undefined };
    setApplications(prev => prev.map(a => a.id === selected.id ? updated : a));
    setSelected(updated);
    await fetchMessages(selected.id);
    setSending(false);
  }

  async function declineProposal() {
    if (!selected) return;
    await fetch(`/api/messages/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Proposition de rendez-vous refusée.", type: "TEXT" }),
    });
    await fetchMessages(selected.id);
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const fmtDt = (d: string) => new Date(d).toLocaleString("fr-BE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });

  const filtered = filterStatus === "ALL" ? applications : applications.filter(a => a.status === filterStatus);
  const counts = {
    ALL: applications.length,
    INVITED: applications.filter(a => a.status === "INVITED").length,
    PENDING: applications.filter(a => a.status === "PENDING").length,
    ACCEPTED: applications.filter(a => a.status === "ACCEPTED").length,
    REJECTED: applications.filter(a => a.status === "REJECTED").length,
  };

  async function respondToInvitation(action: "accept" | "decline") {
    if (!selected) return;
    setSending(true);
    const res = await fetch(`/api/applications/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = { ...selected, status: data.status };
      setApplications(prev => prev.map(a => a.id === selected.id ? updated : a));
      setSelected(updated);
      if (action === "accept") await fetchMessages(selected.id);
    }
    setSending(false);
  }

  if (status === "loading" || loading) return null;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">Mes candidatures</h1>
            <p className="text-stone-500 text-sm mt-0.5">Suivez vos demandes et échangez avec les institutions.</p>
          </div>
          <Link href="/student" className="text-sm text-stone-500 hover:text-orange-500 transition-colors">
            ← Retour à la recherche
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
          {[
            { label: "Total", value: counts.ALL, color: "text-stone-900", bg: "bg-white" },
            { label: "Invitations", value: counts.INVITED, color: "text-sky-600", bg: "bg-sky-50" },
            { label: "En attente", value: counts.PENDING, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Acceptées", value: counts.ACCEPTED, color: "text-green-600", bg: "bg-green-50" },
            { label: "Refusées", value: counts.REJECTED, color: "text-red-500", bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-stone-100 p-4 shadow-sm`}>
              <p className={`text-3xl font-medium ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Invitations en attente — bandeau prioritaire */}
        {counts.INVITED > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💌</span>
              <div>
                <p className="text-sm font-medium text-sky-800">
                  {counts.INVITED} invitation{counts.INVITED > 1 ? "s" : ""} en attente de réponse
                </p>
                <p className="text-xs text-sky-600 mt-0.5">Des institutions souhaitent vous accueillir en stage.</p>
              </div>
            </div>
            <button onClick={() => setFilterStatus("INVITED")}
              className="text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl transition-colors flex-shrink-0">
              Voir les invitations
            </button>
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(["ALL", "INVITED", "PENDING", "ACCEPTED", "REJECTED"] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterStatus === f ? "bg-orange-500 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-orange-300"}`}>
              {f === "ALL" ? "Toutes" : statusConfig[f].label}
              <span className="ml-1.5 opacity-60">{counts[f as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-stone-700 font-medium mb-1">Aucune candidature pour l'instant</p>
            <p className="text-stone-400 text-sm mb-5">Explorez les institutions disponibles et postulez !</p>
            <Link href="/student" className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors">
              Rechercher une institution →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5" style={{ minHeight: "480px" }}>

            {/* Liste */}
            <div className={`md:col-span-2 flex flex-col gap-3 overflow-y-auto pr-1 ${selected ? "hidden md:flex" : "flex"}`}
              style={{ maxHeight: "calc(100vh - 300px)" }}>
              {filtered.map(app => {
                const st = statusConfig[app.status];
                const isActive = selected?.id === app.id;
                return (
                  <button key={app.id} onClick={() => setSelected(app)}
                    className={`text-left bg-white rounded-2xl border p-4 transition-all ${isActive ? "border-orange-400 shadow-md shadow-orange-100" : "border-stone-100 hover:border-stone-200 hover:shadow-sm"}`}>
                    {interestedInMe.has(app.institution.id) && app.status !== "INVITED" && (
                      <div className="flex items-center gap-1.5 mb-2 text-blue-600">
                        <span className="text-sm">👍</span>
                        <span className="text-xs font-medium">Cette institution est intéressée par vous</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-stone-900 text-sm leading-snug">{app.institution.name}</p>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-1">📍 {app.institution.address ? `${app.institution.address}, ` : ""}{app.institution.commune}</p>
                    {app.slot?.description && (
                      <p className="text-xs text-stone-500">{app.slot.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {app.cvPath && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-md">📄 CV</span>}
                      {app.letterPath && <span className="text-xs bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-md">✉️ Lettre</span>}
                      {app.appointmentDate && !app.stageStatus && <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-md">📅 RDV</span>}
                      {app.stageStatus === "ONGOING" && <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md font-medium">🎓 Stage en cours</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Panel détail + chat */}
            <div className={`md:col-span-3 bg-white rounded-2xl border border-stone-100 shadow-sm flex flex-col overflow-hidden ${selected ? "flex" : "hidden md:flex"}`}
              style={{ maxHeight: "calc(100vh - 300px)" }}>
              {!selected ? (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                  <div className="text-6xl mb-3">💬</div>
                  <p className="text-sm">Sélectionnez une candidature pour voir les détails et discuter</p>
                </div>
              ) : (
                <>
                  {/* En-tête */}
                  <div className="px-5 py-4 border-b border-stone-100">
                    {/* Bouton retour mobile */}
                    <button onClick={() => setSelected(null)}
                      className="md:hidden flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors">
                      ← Retour à la liste
                    </button>
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/institutions/${selected.institution.id}`}
                          className="font-medium text-stone-900 hover:text-orange-600 transition-colors">
                          {selected.institution.name} →
                        </Link>
                        {(selected.institution.address || selected.institution.commune) && (
                          <p className="text-xs text-stone-400 mt-0.5">
                            📍 {selected.institution.address ? `${selected.institution.address}, ` : ""}{selected.institution.commune}
                          </p>
                        )}
                        {selected.slot?.description && (
                          <p className="text-xs text-stone-500 mt-0.5">{selected.slot.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {selected.cvPath && (
                          <a href={selected.cvPath} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                            📄 Mon CV
                          </a>
                        )}
                        {selected.letterPath && (
                          <a href={selected.letterPath} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors">
                            ✉️ Ma lettre
                          </a>
                        )}
                      </div>
                    </div>

                    {selected.message && (
                      <div className="mt-3 bg-stone-50 rounded-xl px-4 py-2.5 text-sm text-stone-600 italic">
                        "{selected.message}"
                      </div>
                    )}

                    {selected.appointmentDate && (
                      <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                        <p className="text-sm font-medium text-green-700">🎉 Rendez-vous confirmé !</p>
                        <p className="text-xs text-green-600 mt-0.5">
                          {fmt(selected.appointmentDate)}{selected.appointmentNote ? ` — ${selected.appointmentNote}` : ""}
                        </p>
                      </div>
                    )}

                    {selected.stageStatus === "ONGOING" && (
                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-sky-800">🎓 Stage en cours !</p>
                          <p className="text-xs text-sky-600 mt-0.5">Accédez à la page de suivi de votre stage</p>
                        </div>
                        <Link href={`/stage/${selected.id}`}
                          className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex-shrink-0">
                          📋 Mon stage →
                        </Link>
                      </div>
                    )}

                    {selected.stageStatus === "COMPLETED" && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <p className="text-sm font-medium text-green-800">✅ Stage terminé</p>
                        <p className="text-xs text-green-600 mt-0.5">Félicitations pour avoir complété votre stage !</p>
                      </div>
                    )}

                    {selected.status === "INVITED" && (
                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-4">
                        <p className="text-sm font-medium text-sky-800 mb-1">💌 Cette institution vous a envoyé une invitation de stage</p>
                        <p className="text-xs text-sky-600 mb-3">Acceptez pour ouvrir la discussion, ou déclinez si vous n'êtes pas intéressé(e).</p>
                        <div className="flex gap-2">
                          <button onClick={() => respondToInvitation("accept")} disabled={sending}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl transition-colors">
                            ✅ Accepter l'invitation
                          </button>
                          <button onClick={() => respondToInvitation("decline")} disabled={sending}
                            className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium py-2 rounded-xl transition-colors">
                            ❌ Décliner
                          </button>
                        </div>
                      </div>
                    )}

                    {selected.status === "REJECTED" && (
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-red-600">Votre candidature n'a pas été retenue pour ce stage.</p>
                      </div>
                    )}
                  </div>

                  {/* Infos de stage du profil */}
                  {myProfile && (myProfile.stageStartDate || myProfile.stageEndDate || myProfile.stageMaxHours || myProfile.conventionPath) && (
                    <div className="px-5 py-3 border-b border-stone-100 bg-orange-50">
                      <p className="text-xs font-semibold text-orange-700 mb-2">📅 Mes informations de stage</p>
                      <div className="flex flex-wrap gap-4">
                        {myProfile.stageStartDate && (
                          <div>
                            <p className="text-xs text-stone-500">Début</p>
                            <p className="text-sm font-medium text-stone-900">{new Date(myProfile.stageStartDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
                          </div>
                        )}
                        {myProfile.stageEndDate && (
                          <div>
                            <p className="text-xs text-stone-500">Fin</p>
                            <p className="text-sm font-medium text-stone-900">{new Date(myProfile.stageEndDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
                          </div>
                        )}
                        {myProfile.stageMaxHours && (
                          <div>
                            <p className="text-xs text-stone-500">Heures max</p>
                            <p className="text-sm font-medium text-stone-900">{myProfile.stageMaxHours}h</p>
                          </div>
                        )}
                        {myProfile.conventionPath && (
                          <a href={myProfile.conventionPath} target="_blank" rel="noopener noreferrer"
                            className="self-end inline-flex items-center gap-1 text-xs bg-white border border-orange-200 text-orange-700 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            📋 Ma convention →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className={`flex-1 overflow-y-auto px-5 py-4 space-y-3 ${selected.status === "INVITED" ? "hidden" : ""}`} style={{ minHeight: 0 }}>
                    {messages.length === 0 && (
                      <div className="text-center text-stone-300 text-sm py-8">
                        Aucun message. Démarrez la conversation avec l'institution !
                      </div>
                    )}
                    {messages.map(msg => {
                      const isMe = msg.sender.id === user?.id;
                      const isAppt = msg.type === "APPOINTMENT";
                      const isProposal = msg.type === "APPOINTMENT_PROPOSAL";
                      if (isProposal) return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 max-w-sm w-full">
                            <p className="text-xs font-medium text-amber-700 mb-1">
                              📅 Proposition de RDV — {isMe ? "vous" : (msg.sender.name || "l'institution")}
                            </p>
                            {msg.proposedDate && (
                              <p className="text-sm font-medium text-stone-900">{fmtDt(msg.proposedDate)}</p>
                            )}
                            {msg.proposedNote && <p className="text-xs text-stone-600 mt-0.5">{msg.proposedNote}</p>}
                            <p className="text-xs text-stone-400 mt-1">{fmtTime(msg.createdAt)}</p>
                            {!isMe && !selected?.appointmentDate && (
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => acceptProposal(msg)} disabled={sending}
                                  className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                                  ✅ Accepter
                                </button>
                                <button onClick={declineProposal} disabled={sending}
                                  className="flex-1 border border-red-200 text-red-600 text-xs py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                                  ❌ Refuser
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-xs ${isAppt
                            ? "bg-green-50 border border-green-200 rounded-2xl px-4 py-3 w-full max-w-sm"
                            : isMe
                              ? "bg-orange-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5"
                              : "bg-stone-100 text-stone-800 rounded-2xl rounded-tl-sm px-4 py-2.5"
                          }`}>
                            {!isMe && !isAppt && (
                              <p className="text-xs font-medium mb-1 text-stone-500">{msg.sender.name}</p>
                            )}
                            {isAppt && (
                              <p className="text-xs font-medium text-green-600 mb-1">✅ Rendez-vous confirmé</p>
                            )}
                            <p className={`text-sm ${isAppt ? "text-green-800 font-medium" : ""}`}>{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe && !isAppt ? "text-orange-200" : "text-stone-400"}`}>
                              {fmtTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Formulaire RDV */}
                  {showRdvForm && (
                    <div className="px-5 py-4 border-t border-stone-100 bg-amber-50">
                      <p className="text-sm font-medium text-amber-800 mb-3">📅 Proposer un rendez-vous</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-stone-600 mb-1 block">Date et heure</label>
                          <input type="datetime-local" value={rdvDate} onChange={e => setRdvDate(e.target.value)}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        </div>
                        <div>
                          <label className="text-xs text-stone-600 mb-1 block">Lieu / précision</label>
                          <input type="text" value={rdvNote} onChange={e => setRdvNote(e.target.value)}
                            placeholder="Ex: à votre institution"
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowRdvForm(false)}
                          className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2 text-sm hover:bg-white transition-colors">
                          Annuler
                        </button>
                        <button onClick={sendProposal} disabled={!rdvDate || sending}
                          className="flex-1 bg-amber-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                          {sending ? "Envoi…" : "📅 Envoyer la proposition"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Barre d'envoi */}
                  {selected.status !== "REJECTED" && selected.status !== "INVITED" && (
                    <div className="px-4 py-3 border-t border-stone-100 flex gap-2 items-end">
                      {!selected.appointmentDate && (
                        <button onClick={() => setShowRdvForm(!showRdvForm)}
                          className="flex-shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-xl transition-colors font-medium whitespace-nowrap">
                          📅 Proposer un RDV
                        </button>
                      )}
                      <textarea
                        rows={1}
                        value={newMsg}
                        onChange={e => setNewMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Écrire un message à l'institution…"
                        className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none text-stone-900"
                      />
                      <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
                        className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        Envoyer
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
