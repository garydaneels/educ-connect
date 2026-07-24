"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface JobApplication {
  id: string;
  status: string;
  message?: string | null;
  createdAt: string;
  jobOffer: {
    id: string;
    title: string;
    contractType: string;
    institution: {
      id: string;
      name: string;
      address: string;
      commune: string;
    };
  };
}

interface Message {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: { id: string; name?: string; role: string };
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: { label: "Nouveau", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  REVIEWED: { label: "Vu", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  CONTACTED: { label: "Accepté", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
  REJECTED: { label: "Refusé", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

const CONTRACT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  INTERIM: "Intérim",
  BENEVOLE: "Bénévolat",
};

export default function ProfessionalApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "PROFESSIONAL") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/professional/job-applications")
      .then(r => r.json())
      .then(data => {
        setApplications(Array.isArray(data) ? data : []);
        setLoading(false);
      });
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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected, fetchMessages]);

  async function sendMessage() {
    if (!selected || !newMsg.trim()) return;
    setSending(true);
    await fetch(`/api/messages/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg, type: "TEXT" }),
    });
    setNewMsg("");
    await fetchMessages(selected.id);
    setSending(false);
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });

  const filtered =
    filterStatus === "ALL" ? applications : applications.filter(a => a.status === filterStatus);
  const counts = {
    ALL: applications.length,
    PENDING: applications.filter(a => a.status === "PENDING").length,
    REVIEWED: applications.filter(a => a.status === "REVIEWED").length,
    CONTACTED: applications.filter(a => a.status === "CONTACTED").length,
    REJECTED: applications.filter(a => a.status === "REJECTED").length,
  };

  if (status === "loading" || loading) return null;
  if (status === "authenticated" && user?.role !== "PROFESSIONAL") return null;

  return (
    <>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">Mes candidatures</h1>
            <p className="text-stone-500 text-sm mt-1">Suivez vos candidatures et communiquez avec les institutions.</p>
          </div>
          <Link
            href="/professional/jobs"
            className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            💼 Voir les offres
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total", value: counts.ALL, color: "text-stone-900", bg: "bg-white" },
            { label: "Nouveaux", value: counts.PENDING, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Acceptés", value: counts.CONTACTED, color: "text-green-600", bg: "bg-green-50" },
            { label: "Refusés", value: counts.REJECTED, color: "text-red-500", bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-stone-100 p-4`}>
              <p className={`text-3xl font-medium ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(["ALL", "PENDING", "REVIEWED", "CONTACTED", "REJECTED"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterStatus === f
                  ? "bg-sky-600 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-sky-300"
              }`}
            >
              {f === "ALL"
                ? "Toutes"
                : statusConfig[f]?.label ?? f}
              <span className="ml-1.5 opacity-60">{counts[f as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5" style={{ minHeight: "500px" }}>
          {/* Liste */}
          <div
            className={`md:col-span-2 flex flex-col gap-3 overflow-y-auto pr-1 ${
              selected ? "hidden md:flex" : "flex"
            }`}
            style={{ maxHeight: "calc(100vh - 380px)" }}
          >
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm">Aucune candidature</p>
              </div>
            ) : (
              filtered.map(app => {
                const st = statusConfig[app.status];
                const isAct = selected?.id === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelected(app)}
                    className={`text-left bg-white rounded-2xl border p-4 transition-all ${
                      isAct
                        ? "border-sky-400 shadow-md shadow-sky-100"
                        : "border-stone-100 hover:border-stone-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-stone-900 text-sm">{app.jobOffer.title}</p>
                        <p className="text-xs text-stone-400">{app.jobOffer.institution.name}</p>
                      </div>
                      <span
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                        {st.label}
                      </span>
                    </div>
                    {app.message && (
                      <p className="text-xs text-stone-400 mt-1 italic line-clamp-1">
                        "{app.message}"
                      </p>
                    )}
                    <p className="text-xs text-stone-400 mt-2">{fmt(app.createdAt)}</p>
                  </button>
                );
              })
            )}
          </div>

          {/* Panel détail + chat */}
          <div
            className={`md:col-span-3 bg-white rounded-2xl border border-stone-100 flex flex-col overflow-hidden ${
              selected ? "flex" : "hidden md:flex"
            }`}
            style={{ maxHeight: "calc(100vh - 380px)" }}
          >
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                <div className="text-6xl mb-3">💬</div>
                <p className="text-sm">Sélectionnez une candidature pour voir les détails</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-stone-100">
                  <button
                    onClick={() => setSelected(null)}
                    className="md:hidden flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors"
                  >
                    ← Retour à la liste
                  </button>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-stone-900">{selected.jobOffer.title}</p>
                      <p className="text-sm text-stone-500 mt-0.5">{selected.jobOffer.institution.name}</p>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                        statusConfig[selected.status].bg
                      } ${statusConfig[selected.status].text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[selected.status].dot}`}></span>
                      {statusConfig[selected.status].label}
                    </span>
                  </div>

                  <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 space-y-2">
                    <p className="text-xs text-sky-600 font-medium">
                      📋 {selected.jobOffer.institution.address}, {selected.jobOffer.institution.commune}
                    </p>
                    <p className="text-sm text-stone-700">
                      <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-medium mr-2">
                        {CONTRACT_LABELS[selected.jobOffer.contractType] ?? selected.jobOffer.contractType}
                      </span>
                      Candidature reçue le {fmt(selected.createdAt)}
                    </p>
                  </div>

                  {selected.message && (
                    <div className="mt-3 bg-stone-50 rounded-xl px-4 py-2.5 text-sm text-stone-600 italic">
                      "{selected.message}"
                    </div>
                  )}
                </div>

                {/* Chat */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: 0 }}>
                  {messages.length === 0 && (
                    <div className="text-center text-stone-300 text-sm py-8">
                      Commencez la conversation !
                    </div>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.sender.id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs ${
                            isMe
                              ? "bg-sky-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5"
                              : "bg-stone-100 text-stone-800 rounded-2xl rounded-tl-sm px-4 py-2.5"
                          }`}
                        >
                          {!isMe && <p className="text-xs font-medium mb-1 text-stone-500">{msg.sender.name}</p>}
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? "text-sky-200" : "text-stone-400"}`}>
                            {fmtTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Formulaire d'envoi */}
                <div className="px-4 py-3 border-t border-stone-100 flex gap-2 items-end">
                  <textarea
                    rows={1}
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Écrire un message…"
                    className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none text-stone-900"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMsg.trim() || sending}
                    className="flex-shrink-0 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
