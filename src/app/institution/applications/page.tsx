"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

// ── Types stage ─────────────────────────────────────────────────────────────
interface Slot { description?: string; }
interface Student { id: string; name?: string; email: string; }
interface StudentProfileData {
  presentation?: string | null;
  experiences: string;
  previousStages: string;
  stageStartDate?: string | null;
  stageEndDate?: string | null;
  stageMaxHours?: number | null;
  conventionPath?: string | null;
}
interface ExpEntry { title: string; organization: string; startDate: string; endDate: string; ongoing: boolean; description: string; }
interface StageEntry { institutionName: string; sector: string; startDate: string; endDate: string; ongoing: boolean; description: string; }
interface Application {
  id: string;
  status: string;
  stageStatus?: string;
  message?: string;
  cvPath?: string;
  letterPath?: string;
  appointmentDate?: string;
  appointmentNote?: string;
  stageFoundDate?: string;
  createdAt: string;
  student: Student;
  slot: Slot;
}
interface Message {
  id: string;
  content: string;
  type: string;
  proposedDate?: string;
  proposedNote?: string;
  createdAt: string;
  sender: { id: string; name?: string; role: string; };
}

// ── Types emploi ─────────────────────────────────────────────────────────────
interface JobApp {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
  jobOffer: { id: string; title: string; contractType: string };
}

// ── Configs ──────────────────────────────────────────────────────────────────
const stageStatusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  INVITED:   { label: "Invitation envoyée", bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-400" },
  PENDING:   { label: "En attente",         bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  ACCEPTED:  { label: "Acceptée",           bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400" },
  REJECTED:  { label: "Refusée",            bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
  COMPLETED: { label: "Stage trouvé",       bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-400" },
};

const jobStatusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: "Nouveau",   bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  REVIEWED:  { label: "Vu",        bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-400" },
  CONTACTED: { label: "Contacté",  bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500" },
  REJECTED:  { label: "Refusé",    bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400" },
};

const CONTRACT_LABELS: Record<string, string> = {
  CDI: "CDI", CDD: "CDD", ETUDIANT: "Job étudiant", INTERIM: "Intérim", BENEVOLE: "Bénévolat",
};

// ── Composant principal ───────────────────────────────────────────────────────
export default function InstitutionApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const [tab, setTab] = useState<"stages" | "emploi" | "job-etudiant">("stages");
  const [isActive, setIsActive] = useState<boolean | null>(null);

  // ── Stage state ──
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showRdvForm, setShowRdvForm] = useState(false);
  const [rdvDate, setRdvDate] = useState("");
  const [rdvNote, setRdvNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [confirmModal, setConfirmModal] = useState<{ type: "accept" | "reject"; appId: string } | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [studentProfile, setStudentProfile] = useState<StudentProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Emploi state ──
  const [jobApps, setJobApps] = useState<JobApp[]>([]);
  const [loadingJobApps, setLoadingJobApps] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobApp | null>(null);
  const [jobFilterStatus, setJobFilterStatus] = useState("ALL");
  const [jobLocked, setJobLocked] = useState(false);
  const [jobConfirmModal, setJobConfirmModal] = useState<string | null>(null);

  // ── Job étudiant state ──
  const [studentJobApps, setStudentJobApps] = useState<JobApp[]>([]);
  const [loadingStudentJobApps, setLoadingStudentJobApps] = useState(false);
  const [selectedStudentJob, setSelectedStudentJob] = useState<JobApp | null>(null);
  const [studentJobFilterStatus, setStudentJobFilterStatus] = useState("ALL");
  const [studentJobConfirmModal, setStudentJobConfirmModal] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  // Load subscription status
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/institutions/mine", { credentials: "include" }).then(r => r.json()).then(inst => {
      setIsActive(inst?.subscription?.status === "ACTIVE");
    });
  }, [status]);

  // Load stage applications
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/applications").then(r => r.json()).then(data => {
      setApplications(Array.isArray(data) ? data : []);
      setLoadingApps(false);
    });
  }, [status]);

  // Load job applications when switching to emploi tab
  useEffect(() => {
    if (tab !== "emploi" || !isActive) return;
    setLoadingJobApps(true);
    fetch("/api/institution/job-applications").then(r => {
      if (r.status === 403) { setJobLocked(true); setLoadingJobApps(false); return null; }
      return r.json();
    }).then(data => {
      if (data) {
        setJobApps(Array.isArray(data) ? data : []);
        setLoadingJobApps(false);
      }
    });
  }, [tab, isActive]);

  // Load student job applications when switching to job-etudiant tab
  useEffect(() => {
    if (tab !== "job-etudiant" || !isActive) return;
    setLoadingStudentJobApps(true);
    fetch("/api/institution/job-applications").then(r => {
      if (r.status === 403) { setLoadingStudentJobApps(false); return null; }
      return r.json();
    }).then(data => {
      if (data) {
        const studentJobs = Array.isArray(data) ? data.filter((app: JobApp) => app.jobOffer.contractType === "ETUDIANT") : [];
        setStudentJobApps(studentJobs);
        setLoadingStudentJobApps(false);
      }
    });
  }, [tab, isActive]);

  // ── Messages ──
  const fetchMessages = useCallback(async (appId: string) => {
    const res = await fetch(`/api/messages/${appId}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    if (!selected) { if (pollRef.current) clearInterval(pollRef.current); return; }
    fetchMessages(selected.id);
    pollRef.current = setInterval(() => fetchMessages(selected.id), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, fetchMessages]);

  useEffect(() => {
    if (!selected) return;
    setStudentProfile(null);
    setProfileLoading(true);
    fetch(`/api/students/${selected.student?.id}/profile`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStudentProfile(data); setProfileLoading(false); })
      .catch(() => setProfileLoading(false));
  }, [selected]);

  // ── Stage actions ──
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

  async function sendProposal() {
    if (!selected || !rdvDate) return;
    setSending(true);
    const content = `Proposition de rendez-vous : ${fmtDt(rdvDate)}${rdvNote ? ` — ${rdvNote}` : ""}`;
    await fetch(`/api/messages/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type: "APPOINTMENT_PROPOSAL", proposedDate: rdvDate, proposedNote: rdvNote }),
    });
    setShowRdvForm(false); setRdvDate(""); setRdvNote("");
    await fetchMessages(selected.id);
    setSending(false);
  }

  async function acceptProposal(msg: Message) {
    if (!selected || !msg.proposedDate) return;
    setSending(true);
    await fetch(`/api/applications/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACCEPTED", appointmentDate: msg.proposedDate, appointmentNote: msg.proposedNote }),
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

  async function confirmStage(appId: string) {
    const now = new Date().toISOString();
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", stageFoundDate: now }),
    });
    await fetch(`/api/messages/${appId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "✅ Le stage a été confirmé. Félicitations !", type: "TEXT" }),
    });
    const updated = { ...selected!, status: "COMPLETED", stageFoundDate: now };
    setApplications(prev => prev.map(a => a.id === appId ? updated : a));
    setSelected(updated);
    await fetchMessages(appId);
  }

  async function rejectAfterRdv(appId: string) {
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    await fetch(`/api/messages/${appId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Le stage n'a pas pu être confirmé. La place reste disponible pour d'autres candidats.", type: "TEXT" }),
    });
    const updated = { ...selected!, status: "REJECTED" };
    setApplications(prev => prev.map(a => a.id === appId ? updated : a));
    setSelected(updated);
    await fetchMessages(appId);
  }

  async function reject(appId: string) {
    setConfirmModal(null);
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: "REJECTED" } : a));
    if (selected?.id === appId) setSelected(prev => prev ? { ...prev, status: "REJECTED" } : prev);
  }

  async function acceptApplication(appId: string) {
    setConfirmError("");
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) { setConfirmModal(null); router.push(`/stage/${appId}`); }
      else { const body = await res.json().catch(() => ({})); setConfirmError(body.error || `Erreur ${res.status}`); }
    } catch { setConfirmError("Erreur réseau, réessayez."); }
  }

  // ── Job application actions ──
  async function updateJobAppStatus(id: string, newStatus: string) {
    const res = await fetch(`/api/institution/job-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setJobApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      if (selectedJob?.id === id) setSelectedJob(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  }

  async function acceptJobApplication(id: string) {
    const res = await fetch(`/api/institution/job-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    if (res.ok) {
      setJobApps(prev => prev.map(a => a.id === id ? { ...a, status: "CONTACTED" } : a));
      setSelectedJob(null);
      setJobConfirmModal(null);
    }
  }

  async function acceptStudentJobApplication(id: string) {
    const res = await fetch(`/api/institution/job-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    if (res.ok) {
      setStudentJobApps(prev => prev.map(a => a.id === id ? { ...a, status: "CONTACTED" } : a));
      setSelectedStudentJob(null);
      setStudentJobConfirmModal(null);
    }
  }

  // ── Formatters ──
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const fmtShort = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
  const fmtDt = (d: string) => new Date(d).toLocaleString("fr-BE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });

  const filtered = filterStatus === "ALL" ? applications : applications.filter(a => a.status === filterStatus);
  const counts = {
    ALL: applications.length,
    INVITED: applications.filter(a => a.status === "INVITED").length,
    PENDING: applications.filter(a => a.status === "PENDING").length,
    ACCEPTED: applications.filter(a => a.status === "ACCEPTED").length,
    COMPLETED: applications.filter(a => a.status === "COMPLETED").length,
    REJECTED: applications.filter(a => a.status === "REJECTED").length,
  };

  const filteredJobApps = jobFilterStatus === "ALL" ? jobApps : jobApps.filter(a => a.status === jobFilterStatus);
  const jobCounts = {
    ALL: jobApps.length,
    PENDING: jobApps.filter(a => a.status === "PENDING").length,
    REVIEWED: jobApps.filter(a => a.status === "REVIEWED").length,
    CONTACTED: jobApps.filter(a => a.status === "CONTACTED").length,
    REJECTED: jobApps.filter(a => a.status === "REJECTED").length,
  };
  const acceptedCount = jobApps.filter(a => a.status === "CONTACTED").length;

  if (status === "loading" || loadingApps) return null;
  if (status === "authenticated" && user?.role !== "INSTITUTION") return null;

  return (
    <>
      <Navbar />

      {/* Modal acceptation candidature emploi */}
      {jobConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl flex-shrink-0">✓</div>
              <h3 className="text-base font-semibold text-stone-900">Accepter ce candidat ?</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              Êtes-vous sûr ? Le post disparaîtra de vos candidatures et le candidat sera marqué comme contacté.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setJobConfirmModal(null)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors font-medium">Annuler</button>
              <button onClick={() => acceptJobApplication(jobConfirmModal)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Confirmer l'acceptation</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal acceptation candidature job étudiant */}
      {studentJobConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl flex-shrink-0">✓</div>
              <h3 className="text-base font-semibold text-stone-900">Accepter ce candidat ?</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              Êtes-vous sûr ? Le post disparaîtra de vos candidatures et le candidat sera marqué comme contacté.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStudentJobConfirmModal(null)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors font-medium">Annuler</button>
              <button onClick={() => acceptStudentJobApplication(studentJobConfirmModal)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Confirmer l'acceptation</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {confirmModal.type === "accept" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl flex-shrink-0">✓</div>
                  <h3 className="text-base font-semibold text-stone-900">Accepter ce stage ?</h3>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  En acceptant, vous confirmez prendre cet étudiant durant son stage et vous engagez à respecter le règlement de sa convention de stage, que vous recevrez.
                </p>
                {confirmError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{confirmError}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setConfirmModal(null)}
                    className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors font-medium">Annuler</button>
                  <button onClick={() => acceptApplication(confirmModal.appId)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Confirmer l'acceptation</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl flex-shrink-0">✗</div>
                  <h3 className="text-base font-semibold text-stone-900">Refuser cette candidature ?</h3>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  Vous allez refuser la candidature de cet étudiant. Il sera notifié du refus et la place de stage restera disponible pour d'autres candidats.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmModal(null)}
                    className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors font-medium">Annuler</button>
                  <button onClick={() => reject(confirmModal.appId)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Confirmer le refus</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header + tabs */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">Candidatures reçues</h1>
            <p className="text-stone-500 text-sm mt-1">Gérez les demandes et communiquez avec les candidats.</p>
          </div>
        </div>

        {/* Toggle tabs */}
        <div className="flex gap-2 mb-6 bg-stone-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => { setTab("stages"); setSelected(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === "stages" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
            }`}>
            🎓 Candidatures stages
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === "stages" ? "bg-sky-100 text-sky-700" : "bg-stone-200 text-stone-500"}`}>
              {counts.ALL}
            </span>
          </button>

          <button
            onClick={() => {
              if (!isActive) return;
              setTab("emploi");
              setSelected(null);
            }}
            disabled={!isActive}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              !isActive
                ? "text-stone-400 cursor-not-allowed"
                : tab === "emploi"
                ? "bg-white shadow-sm text-stone-900"
                : "text-stone-500 hover:text-stone-700"
            }`}>
            {!isActive && <span className="text-xs">🔒</span>}
            💼 Candidatures emploi
            {isActive && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === "emploi" ? "bg-violet-100 text-violet-700" : "bg-stone-200 text-stone-500"}`}>
                {jobApps.filter(j => j.jobOffer.contractType !== "ETUDIANT").length}
              </span>
            )}
            {!isActive && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full ml-1">
                Abonnement requis
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!isActive) return;
              setTab("job-etudiant");
              setSelected(null);
            }}
            disabled={!isActive}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              !isActive
                ? "text-stone-400 cursor-not-allowed"
                : tab === "job-etudiant"
                ? "bg-white shadow-sm text-stone-900"
                : "text-stone-500 hover:text-stone-700"
            }`}>
            {!isActive && <span className="text-xs">🔒</span>}
            👨‍🎓 Jobs étudiants
            {isActive && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === "job-etudiant" ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500"}`}>
                {studentJobApps.length}
              </span>
            )}
            {!isActive && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full ml-1">
                Abonnement requis
              </span>
            )}
          </button>
        </div>

        {/* ══ ONGLET STAGES ════════════════════════════════════════════════════ */}
        {tab === "stages" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: "Total",        value: counts.ALL,       color: "text-stone-900", bg: "bg-white" },
                { label: "Invitations",  value: counts.INVITED,   color: "text-sky-600",   bg: "bg-sky-50" },
                { label: "En attente",   value: counts.PENDING,   color: "text-amber-600", bg: "bg-amber-50" },
                { label: "RDV fixé",     value: counts.ACCEPTED,  color: "text-green-600", bg: "bg-green-50" },
                { label: "Stage trouvé", value: counts.COMPLETED, color: "text-sky-600",   bg: "bg-sky-50" },
                { label: "Refusées",     value: counts.REJECTED,  color: "text-red-500",   bg: "bg-red-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-2xl border border-stone-100 p-4`}>
                  <p className={`text-3xl font-medium ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-stone-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(["ALL", "INVITED", "PENDING", "ACCEPTED", "COMPLETED", "REJECTED"] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterStatus === f ? "bg-sky-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-sky-300"}`}>
                  {f === "ALL" ? "Toutes" : stageStatusConfig[f].label}
                  <span className="ml-1.5 opacity-60">{counts[f as keyof typeof counts]}</span>
                </button>
              ))}
            </div>

            {/* Layout 2 colonnes */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5" style={{ minHeight: "500px" }}>
              {/* Liste */}
              <div className={`md:col-span-2 flex flex-col gap-3 overflow-y-auto pr-1 ${selected ? "hidden md:flex" : "flex"}`}
                style={{ maxHeight: "calc(100vh - 380px)" }}>
                {filtered.length === 0 ? (
                  <div className="text-center py-16 text-stone-400">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sm">Aucune candidature</p>
                  </div>
                ) : filtered.map(app => {
                  const st = stageStatusConfig[app.status];
                  const isAct = selected?.id === app.id;
                  return (
                    <button key={app.id} onClick={() => setSelected(app)}
                      className={`text-left bg-white rounded-2xl border p-4 transition-all ${isAct ? "border-sky-400 shadow-md shadow-sky-100" : "border-stone-100 hover:border-stone-200 hover:shadow-sm"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-stone-900 text-sm">{app.student?.name || app.student?.email}</p>
                          <p className="text-xs text-stone-400">{app.student?.email}</p>
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {st.label}
                        </span>
                      </div>
                      {app.message && <p className="text-xs text-stone-400 mt-1 italic line-clamp-1">"{app.message}"</p>}
                      <div className="flex gap-2 mt-2">
                        {app.cvPath && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-md">📄 CV</span>}
                        {app.letterPath && <span className="text-xs bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-md">✉️ Lettre</span>}
                        {app.status === "COMPLETED" && <span className="text-xs bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-md">🏆 Stage confirmé</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Panel détail + chat */}
              <div className={`md:col-span-3 bg-white rounded-2xl border border-stone-100 flex flex-col overflow-hidden ${selected ? "flex" : "hidden md:flex"}`}
                style={{ maxHeight: "calc(100vh - 380px)" }}>
                {!selected ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                    <div className="text-6xl mb-3">💬</div>
                    <p className="text-sm">Sélectionnez une candidature pour voir les détails</p>
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-4 border-b border-stone-100">
                      <button onClick={() => setSelected(null)}
                        className="md:hidden flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors">
                        ← Retour à la liste
                      </button>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-stone-900">{selected.student?.name || selected.student?.email}</p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {selected.student?.email}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/students/${selected.student?.id}`} target="_blank"
                            className="text-xs bg-stone-50 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                            👤 Profil
                          </Link>
                          {selected.cvPath && (
                            <a href={selected.cvPath} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                              📄 CV
                            </a>
                          )}
                          {selected.letterPath && (
                            <a href={selected.letterPath} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors">
                              ✉️ Lettre
                            </a>
                          )}
                          {selected.status === "PENDING" && (
                            <>
                              <button onClick={() => { setConfirmError(""); setConfirmModal({ type: "accept", appId: selected.id }); }}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                                ✓ Accepter le stage
                              </button>
                              <button onClick={() => { setConfirmError(""); setConfirmModal({ type: "reject", appId: selected.id }); }}
                                className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                Refuser
                              </button>
                            </>
                          )}
                          {selected.stageStatus === "ONGOING" && (
                            <Link href={`/stage/${selected.id}`}
                              className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                              📋 Gérer le stage
                            </Link>
                          )}
                        </div>
                      </div>

                      {selected.status === "INVITED" && (
                        <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                          <p className="text-sm font-medium text-sky-800">💌 Invitation envoyée — en attente de réponse</p>
                          <p className="text-xs text-sky-600 mt-0.5">L'étudiant(e) recevra une notification et pourra accepter ou décliner.</p>
                        </div>
                      )}

                      {selected.message && (
                        <div className="mt-3 bg-stone-50 rounded-xl px-4 py-2.5 text-sm text-stone-600 italic">"{selected.message}"</div>
                      )}
                      {selected.appointmentDate && selected.status !== "COMPLETED" && (
                        <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                          <p className="text-sm font-medium text-green-700">📅 Rendez-vous fixé</p>
                          <p className="text-xs text-green-600 mt-0.5">
                            {fmtDt(selected.appointmentDate)}{selected.appointmentNote ? ` — ${selected.appointmentNote}` : ""}
                          </p>
                        </div>
                      )}
                      {selected.status === "COMPLETED" && (
                        <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
                          <p className="text-sm font-medium text-sky-700">🏆 Stage confirmé</p>
                          {selected.stageFoundDate && (
                            <p className="text-xs text-sky-600 mt-0.5">Confirmé le {fmt(selected.stageFoundDate)}</p>
                          )}
                        </div>
                      )}
                      {selected.status === "ACCEPTED" && selected.appointmentDate && (
                        <div className="mt-3 border border-stone-200 rounded-xl p-3 bg-stone-50">
                          <p className="text-xs font-medium text-stone-600 mb-2">Suite du rendez-vous</p>
                          <div className="flex gap-2">
                            <button onClick={() => confirmStage(selected.id)}
                              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-xs py-2 rounded-lg font-medium transition-colors">
                              🏆 Stage trouvé — clôturer
                            </button>
                            <button onClick={() => rejectAfterRdv(selected.id)}
                              className="flex-1 border border-stone-300 text-stone-600 text-xs py-2 rounded-lg hover:bg-white transition-colors">
                              Pas de suite — garder la place
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Profil étudiant */}
                    <div className="border-t border-stone-100 px-5 py-4 max-h-72 overflow-y-auto">
                      {profileLoading ? (
                        <p className="text-sm text-stone-400 py-2">Chargement…</p>
                      ) : !studentProfile ? (
                        <p className="text-sm text-stone-400 italic py-2">Cet étudiant n'a pas encore complété son profil.</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Infos stage */}
                          {(studentProfile.stageStartDate || studentProfile.stageEndDate || studentProfile.stageMaxHours || studentProfile.conventionPath) && (
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
                              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">📅 Informations de stage</p>
                              {(studentProfile.stageStartDate || studentProfile.stageEndDate) && (
                                <div className="flex gap-4 flex-wrap">
                                  {studentProfile.stageStartDate && (
                                    <div>
                                      <p className="text-xs text-stone-500">Début</p>
                                      <p className="text-sm font-medium text-stone-900">{new Date(studentProfile.stageStartDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    </div>
                                  )}
                                  {studentProfile.stageEndDate && (
                                    <div>
                                      <p className="text-xs text-stone-500">Fin</p>
                                      <p className="text-sm font-medium text-stone-900">{new Date(studentProfile.stageEndDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {studentProfile.stageMaxHours && (
                                <div>
                                  <p className="text-xs text-stone-500">Heures maximum</p>
                                  <p className="text-sm font-medium text-stone-900">{studentProfile.stageMaxHours}h</p>
                                </div>
                              )}
                              {studentProfile.conventionPath && (
                                <a href={studentProfile.conventionPath} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                                  📋 Voir la convention de stage →
                                </a>
                              )}
                            </div>
                          )}
                          {(() => {
                            const exps: ExpEntry[] = JSON.parse(studentProfile.experiences || "[]");
                            return exps.length > 0 ? (
                              <div>
                                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Expériences</p>
                                <div className="space-y-2">
                                  {exps.map((exp, i) => (
                                    <div key={i} className="bg-stone-50 rounded-xl px-3 py-2">
                                      <p className="text-sm font-medium text-stone-900">{exp.title}</p>
                                      <p className="text-xs text-stone-500">{exp.organization}</p>
                                      <p className="text-xs text-stone-400">{exp.startDate} — {exp.ongoing ? "En cours" : exp.endDate}</p>
                                      {exp.description && <p className="text-xs text-stone-600 mt-1">{exp.description}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {(() => {
                            const prev: StageEntry[] = JSON.parse(studentProfile.previousStages || "[]");
                            return prev.length > 0 ? (
                              <div>
                                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Stages précédents</p>
                                <div className="space-y-2">
                                  {prev.map((s, i) => (
                                    <div key={i} className="bg-stone-50 rounded-xl px-3 py-2">
                                      <p className="text-sm font-medium text-stone-900">{s.institutionName}</p>
                                      <p className="text-xs text-stone-400">{s.startDate} — {s.ongoing ? "En cours" : s.endDate}</p>
                                      {s.description && <p className="text-xs text-stone-600 mt-1">{s.description}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {JSON.parse(studentProfile.experiences || "[]").length === 0 && JSON.parse(studentProfile.previousStages || "[]").length === 0 && !studentProfile.stageStartDate && !studentProfile.stageMaxHours && !studentProfile.conventionPath && (
                            <p className="text-sm text-stone-400 italic">Profil vide.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: 0 }}>
                      {messages.length === 0 && (
                        <div className="text-center text-stone-300 text-sm py-8">Commencez la conversation !</div>
                      )}
                      {messages.map(msg => {
                        const isMe = msg.sender.id === user?.id;
                        const isAppt = msg.type === "APPOINTMENT";
                        const isProposal = msg.type === "APPOINTMENT_PROPOSAL";
                        if (isProposal) return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 max-w-sm w-full">
                              <p className="text-xs font-medium text-amber-700 mb-1">
                                📅 Proposition de RDV — {isMe ? "vous" : (msg.sender.name || "l'étudiant")}
                              </p>
                              {msg.proposedDate && <p className="text-sm font-medium text-stone-900">{fmtDt(msg.proposedDate)}</p>}
                              {msg.proposedNote && <p className="text-xs text-stone-600 mt-0.5">{msg.proposedNote}</p>}
                              <p className="text-xs text-stone-400 mt-1">{fmtTime(msg.createdAt)}</p>
                              {!isMe && !selected?.appointmentDate && (
                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => acceptProposal(msg)} disabled={sending}
                                    className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">✅ Accepter</button>
                                  <button onClick={declineProposal} disabled={sending}
                                    className="flex-1 border border-red-200 text-red-600 text-xs py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">❌ Refuser</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-xs ${isAppt ? "bg-green-50 border border-green-200 rounded-2xl px-4 py-3" : isMe ? "bg-sky-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5" : "bg-stone-100 text-stone-800 rounded-2xl rounded-tl-sm px-4 py-2.5"}`}>
                              {!isMe && <p className="text-xs font-medium mb-1 text-stone-500">{msg.sender.name}</p>}
                              <p className={`text-sm ${isAppt ? "text-green-800 font-medium" : ""}`}>{msg.content}</p>
                              <p className={`text-xs mt-1 ${isMe && !isAppt ? "text-sky-200" : "text-stone-400"}`}>{fmtTime(msg.createdAt)}</p>
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
                              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-300" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 mb-1 block">Lieu / précision</label>
                            <input type="text" value={rdvNote} onChange={e => setRdvNote(e.target.value)}
                              placeholder="Ex: Bureau direction, 1er étage"
                              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-300" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowRdvForm(false)}
                            className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2 text-sm hover:bg-white transition-colors">Annuler</button>
                          <button onClick={sendProposal} disabled={!rdvDate || sending}
                            className="flex-1 bg-amber-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                            {sending ? "Envoi…" : "📅 Envoyer la proposition"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Barre d'envoi */}
                    {selected.status !== "COMPLETED" && selected.status !== "INVITED" && (
                      <div className="px-4 py-3 border-t border-stone-100 flex gap-2 items-end">
                        {selected.status !== "REJECTED" && !selected.appointmentDate && (
                          <button onClick={() => setShowRdvForm(!showRdvForm)}
                            className="flex-shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-xl transition-colors font-medium whitespace-nowrap">
                            📅 Proposer un RDV
                          </button>
                        )}
                        <textarea rows={1} value={newMsg} onChange={e => setNewMsg(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Écrire un message…"
                          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none text-stone-900" />
                        <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
                          className="flex-shrink-0 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                          Envoyer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ ONGLET EMPLOI ════════════════════════════════════════════════════ */}
        {tab === "emploi" && (
          <>
            {!isActive || jobLocked ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🔒</div>
                <p className="text-lg font-medium text-stone-900 mb-1">Abonnement requis</p>
                <p className="text-sm text-stone-500 mb-5">Activez un abonnement pour accéder aux candidatures reçues sur vos offres d'emploi.</p>
                <Link href="/institution/membership"
                  className="inline-block bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Voir les abonnements →
                </Link>
              </div>
            ) : loadingJobApps ? (
              <div className="text-center py-20 text-stone-400">Chargement…</div>
            ) : (
              <>
                {/* Stats emploi */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                  {[
                    { label: "Total",     value: jobCounts.ALL,       color: "text-stone-900", bg: "bg-white" },
                    { label: "Nouveaux",  value: jobCounts.PENDING,   color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Acceptés",  value: acceptedCount,       color: "text-green-600", bg: "bg-green-50" },
                    { label: "Refusés",   value: jobCounts.REJECTED,  color: "text-red-500",   bg: "bg-red-50" },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-2xl border border-stone-100 p-4`}>
                      <p className={`text-3xl font-medium ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-stone-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filtres emploi */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {(["ALL", "PENDING", "REVIEWED", "CONTACTED", "REJECTED"] as const).map(f => (
                    <button key={f} onClick={() => setJobFilterStatus(f)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${jobFilterStatus === f ? "bg-violet-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-violet-300"}`}>
                      {f === "ALL" ? "Toutes" : jobStatusConfig[f]?.label ?? f}
                      <span className="ml-1.5 opacity-60">{jobCounts[f as keyof typeof jobCounts]}</span>
                    </button>
                  ))}
                </div>

                {filteredJobApps.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-stone-100">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-stone-900 font-medium mb-1">Aucune candidature emploi</p>
                    <p className="text-stone-500 text-sm">Les candidatures de vos offres CDI/CDD apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-5" style={{ minHeight: "400px" }}>
                    {/* Liste */}
                    <div className={`md:col-span-2 flex flex-col gap-3 overflow-y-auto pr-1 ${selectedJob ? "hidden md:flex" : "flex"}`}
                      style={{ maxHeight: "calc(100vh - 380px)" }}>
                      {filteredJobApps.map(app => {
                        const st = jobStatusConfig[app.status] ?? jobStatusConfig.PENDING;
                        const isAct = selectedJob?.id === app.id;
                        return (
                          <button key={app.id} onClick={() => setSelectedJob(app)}
                            className={`text-left bg-white rounded-2xl border p-4 transition-all ${isAct ? "border-violet-400 shadow-md shadow-violet-100" : "border-stone-100 hover:border-stone-200 hover:shadow-sm"}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-stone-900 text-sm">{app.name}</p>
                                <p className="text-xs text-stone-400">{app.email}</p>
                              </div>
                              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                                {st.label}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mb-1">
                              <span className="bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-md font-medium mr-1">
                                {CONTRACT_LABELS[app.jobOffer.contractType] ?? app.jobOffer.contractType}
                              </span>
                              {app.jobOffer.title}
                            </p>
                            <p className="text-xs text-stone-400">{fmtShort(app.createdAt)}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Détail candidature emploi */}
                    <div className={`md:col-span-3 bg-white rounded-2xl border border-stone-100 overflow-hidden flex flex-col ${selectedJob ? "flex" : "hidden md:flex"}`}
                      style={{ maxHeight: "calc(100vh - 380px)" }}>
                      {!selectedJob ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                          <div className="text-6xl mb-3">💼</div>
                          <p className="text-sm">Sélectionnez une candidature</p>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full overflow-y-auto">
                          <div className="p-5 border-b border-stone-100">
                            <button onClick={() => setSelectedJob(null)}
                              className="md:hidden flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors">
                              ← Retour à la liste
                            </button>

                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div>
                                <h2 className="font-semibold text-stone-900 text-base">{selectedJob.name}</h2>
                                <p className="text-sm text-stone-500 mt-0.5">Reçu le {fmt(selectedJob.createdAt)}</p>
                              </div>
                              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${(jobStatusConfig[selectedJob.status] ?? jobStatusConfig.PENDING).bg} ${(jobStatusConfig[selectedJob.status] ?? jobStatusConfig.PENDING).text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${(jobStatusConfig[selectedJob.status] ?? jobStatusConfig.PENDING).dot}`}></span>
                                {(jobStatusConfig[selectedJob.status] ?? jobStatusConfig.PENDING).label}
                              </span>
                            </div>

                            <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-4">
                              <p className="text-xs text-violet-600 font-medium mb-0.5">Offre postulée</p>
                              <p className="text-sm font-medium text-stone-900">{selectedJob.jobOffer.title}</p>
                              <span className="text-xs bg-white border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                                {CONTRACT_LABELS[selectedJob.jobOffer.contractType] ?? selectedJob.jobOffer.contractType}
                              </span>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-stone-50 rounded-xl px-4 py-3">
                                  <p className="text-xs text-stone-400 mb-0.5">Email</p>
                                  <a href={`mailto:${selectedJob.email}`} className="text-sm text-sky-600 hover:underline font-medium">{selectedJob.email}</a>
                                </div>
                                {selectedJob.phone && (
                                  <div className="bg-stone-50 rounded-xl px-4 py-3">
                                    <p className="text-xs text-stone-400 mb-0.5">Téléphone</p>
                                    <a href={`tel:${selectedJob.phone}`} className="text-sm text-stone-900 font-medium hover:underline">{selectedJob.phone}</a>
                                  </div>
                                )}
                              </div>

                              {selectedJob.message && (
                                <div className="bg-stone-50 rounded-xl px-4 py-3">
                                  <p className="text-xs text-stone-400 mb-1">Message de motivation</p>
                                  <p className="text-sm text-stone-800 leading-relaxed">{selectedJob.message}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions de statut */}
                          <div className="p-5 border-t border-stone-100 mt-auto">
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Actions</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <button onClick={() => setJobConfirmModal(selectedJob.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-medium transition-colors">
                                ✓ Accepter ce candidat
                              </button>
                            </div>
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Changer le statut</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { s: "REVIEWED",  label: "Marquer comme vu",   cls: "border border-blue-200 text-blue-700 hover:bg-blue-50" },
                                { s: "REJECTED",  label: "Refuser",             cls: "border border-red-200 text-red-500 hover:bg-red-50" },
                              ].map(({ s, label, cls }) => (
                                <button key={s}
                                  onClick={() => updateJobAppStatus(selectedJob.id, s)}
                                  disabled={selectedJob.status === s}
                                  className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 ${cls}`}>
                                  {label}
                                </button>
                              ))}
                              <a href={`mailto:${selectedJob.email}?subject=Votre candidature — ${selectedJob.jobOffer.title}`}
                                className="px-3 py-2.5 rounded-xl text-xs font-medium transition-colors bg-sky-600 hover:bg-sky-700 text-white text-center">
                                ✉️ Envoyer un email
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══ ONGLET JOBS ÉTUDIANTS ════════════════════════════════════════════ */}
        {tab === "job-etudiant" && (
          <>
            {loadingStudentJobApps ? (
              <div className="text-center py-20">
                <div className="text-3xl mb-2">⏳</div>
                <p className="text-stone-500">Chargement des candidatures…</p>
              </div>
            ) : (
              <>
                {/* Stats job étudiant */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    const all = studentJobApps.length;
                    const pending = studentJobApps.filter(a => a.status === "PENDING").length;
                    const contacted = studentJobApps.filter(a => a.status === "CONTACTED").length;
                    const rejected = studentJobApps.filter(a => a.status === "REJECTED").length;
                    return [
                      { label: "Total",     value: all,       color: "text-stone-900", bg: "bg-white" },
                      { label: "Nouveaux",  value: pending,   color: "text-amber-600", bg: "bg-amber-50" },
                      { label: "Contactés", value: contacted, color: "text-green-600", bg: "bg-green-50" },
                      { label: "Refusés",   value: rejected,  color: "text-red-500",   bg: "bg-red-50" },
                    ];
                  })().map(s => (
                    <div key={s.label} className={`${s.bg} rounded-2xl border border-stone-100 p-4`}>
                      <p className={`text-3xl font-medium ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-stone-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filtres job étudiant */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {(["ALL", "PENDING", "REVIEWED", "CONTACTED", "REJECTED"] as const).map(f => {
                    const counts = {
                      ALL: studentJobApps.length,
                      PENDING: studentJobApps.filter(a => a.status === "PENDING").length,
                      REVIEWED: studentJobApps.filter(a => a.status === "REVIEWED").length,
                      CONTACTED: studentJobApps.filter(a => a.status === "CONTACTED").length,
                      REJECTED: studentJobApps.filter(a => a.status === "REJECTED").length,
                    };
                    return (
                      <button key={f} onClick={() => setStudentJobFilterStatus(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${studentJobFilterStatus === f ? "bg-emerald-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-emerald-300"}`}>
                        {f === "ALL" ? "Toutes" : jobStatusConfig[f]?.label ?? f}
                        <span className="ml-1.5 opacity-60">{counts[f]}</span>
                      </button>
                    );
                  })}
                </div>

                {studentJobApps.filter(a => studentJobFilterStatus === "ALL" || a.status === studentJobFilterStatus).length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-stone-100">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-stone-900 font-medium mb-1">Aucune candidature job étudiant</p>
                    <p className="text-stone-500 text-sm">Les candidatures de vos offres de jobs étudiants apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-5" style={{ minHeight: "400px" }}>
                    {/* Liste */}
                    <div className={`md:col-span-2 flex flex-col gap-3 overflow-y-auto pr-1 ${selectedStudentJob ? "hidden md:flex" : "flex"}`}
                      style={{ maxHeight: "calc(100vh - 380px)" }}>
                      {studentJobApps.filter(a => studentJobFilterStatus === "ALL" || a.status === studentJobFilterStatus).map(app => {
                        const st = jobStatusConfig[app.status] ?? jobStatusConfig.PENDING;
                        const isAct = selectedStudentJob?.id === app.id;
                        return (
                          <button key={app.id} onClick={() => setSelectedStudentJob(app)}
                            className={`text-left bg-white rounded-2xl border p-4 transition-all ${isAct ? "border-emerald-400 shadow-md shadow-emerald-100" : "border-stone-100 hover:border-stone-200 hover:shadow-sm"}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-stone-900 text-sm">{app.name}</p>
                                <p className="text-xs text-stone-400">{app.email}</p>
                              </div>
                              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                                {st.label}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mb-1">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-medium mr-1">
                                👨‍🎓 Job étudiant
                              </span>
                              {app.jobOffer.title}
                            </p>
                            <p className="text-xs text-stone-400">{fmtShort(app.createdAt)}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Détail candidature job étudiant */}
                    <div className={`md:col-span-3 bg-white rounded-2xl border border-stone-100 overflow-hidden flex flex-col ${selectedStudentJob ? "flex" : "hidden md:flex"}`}
                      style={{ maxHeight: "calc(100vh - 380px)" }}>
                      {!selectedStudentJob ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                          <div className="text-6xl mb-3">👨‍🎓</div>
                          <p className="text-sm">Sélectionnez une candidature</p>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full overflow-y-auto">
                          <div className="p-5 border-b border-stone-100">
                            <button onClick={() => setSelectedStudentJob(null)}
                              className="md:hidden flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors">
                              ← Retour à la liste
                            </button>

                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div>
                                <h2 className="font-semibold text-stone-900 text-base">{selectedStudentJob.name}</h2>
                                <p className="text-sm text-stone-500 mt-0.5">Reçu le {fmt(selectedStudentJob.createdAt)}</p>
                              </div>
                              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${(jobStatusConfig[selectedStudentJob.status] ?? jobStatusConfig.PENDING).bg} ${(jobStatusConfig[selectedStudentJob.status] ?? jobStatusConfig.PENDING).text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${(jobStatusConfig[selectedStudentJob.status] ?? jobStatusConfig.PENDING).dot}`}></span>
                                {(jobStatusConfig[selectedStudentJob.status] ?? jobStatusConfig.PENDING).label}
                              </span>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
                              <p className="text-xs text-emerald-600 font-medium mb-0.5">Offre postulée</p>
                              <p className="text-sm font-medium text-stone-900">{selectedStudentJob.jobOffer.title}</p>
                              <span className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                                👨‍🎓 Job étudiant
                              </span>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-stone-50 rounded-xl px-4 py-3">
                                  <p className="text-xs text-stone-400 mb-0.5">Email</p>
                                  <a href={`mailto:${selectedStudentJob.email}`} className="text-sm text-sky-600 hover:underline font-medium">{selectedStudentJob.email}</a>
                                </div>
                                {selectedStudentJob.phone && (
                                  <div className="bg-stone-50 rounded-xl px-4 py-3">
                                    <p className="text-xs text-stone-400 mb-0.5">Téléphone</p>
                                    <a href={`tel:${selectedStudentJob.phone}`} className="text-sm text-stone-900 font-medium hover:underline">{selectedStudentJob.phone}</a>
                                  </div>
                                )}
                              </div>

                              {selectedStudentJob.message && (
                                <div className="bg-stone-50 rounded-xl px-4 py-3">
                                  <p className="text-xs text-stone-400 mb-1">Message de motivation</p>
                                  <p className="text-sm text-stone-800 leading-relaxed">{selectedStudentJob.message}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions de statut */}
                          <div className="p-5 border-t border-stone-100 mt-auto">
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Actions</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <button onClick={() => setStudentJobConfirmModal(selectedStudentJob.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-medium transition-colors">
                                ✓ Accepter ce candidat
                              </button>
                            </div>
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Changer le statut</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { s: "REVIEWED",  label: "Marquer comme vu",   cls: "border border-blue-200 text-blue-700 hover:bg-blue-50" },
                                { s: "REJECTED",  label: "Refuser",             cls: "border border-red-200 text-red-500 hover:bg-red-50" },
                              ].map(({ s, label, cls }) => (
                                <button key={s}
                                  onClick={() => updateJobAppStatus(selectedStudentJob.id, s)}
                                  disabled={selectedStudentJob.status === s}
                                  className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 ${cls}`}>
                                  {label}
                                </button>
                              ))}
                              <a href={`mailto:${selectedStudentJob.email}?subject=Votre candidature — ${selectedStudentJob.jobOffer.title}`}
                                className="px-3 py-2.5 rounded-xl text-xs font-medium transition-colors bg-sky-600 hover:bg-sky-700 text-white text-center">
                                ✉️ Envoyer un email
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </>
  );
}
