"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface ScheduleEntry { date: string; start: string; end: string; }
interface Unavailability { id: string; date: string; reason?: string; status: string; }
interface StageDocument { id: string; name: string; path: string; createdAt: string; }
interface ScheduleRequest { id: string; description: string; status: string; responseNote?: string; createdAt: string; }
interface StageData {
  id: string;
  status: string;
  stageStatus?: string;
  weeklySchedule: string;
  appointmentDate?: string;
  student: { id: string; name?: string; email: string; };
  institution: { id: string; name: string; userId: string; };
  slot: { startDate?: string | null; endDate?: string | null; } | null;
  stageDocuments: StageDocument[];
  unavailabilities: Unavailability[];
  scheduleRequests: ScheduleRequest[];
}

function hoursFromEntry(e: ScheduleEntry) {
  if (!e.start || !e.end) return 0;
  const [sh, sm] = e.start.split(":").map(Number);
  const [eh, em] = e.end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DOW_FR = ["Di","Lu","Ma","Me","Je","Ve","Sa"];
const DOW_LONG = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

const stageStatusConfig: Record<string, { label: string; color: string }> = {
  ONGOING:       { label: "Stage en cours",      color: "bg-sky-50 text-sky-700 border-sky-200" },
  COMPLETED:     { label: "Stage validé ✅",     color: "bg-green-50 text-green-700 border-green-200" },
  NOT_VALIDATED: { label: "Stage non validé ❌", color: "bg-red-50 text-red-700 border-red-200" },
  STOPPED:       { label: "Stage arrêté ⏹",      color: "bg-amber-50 text-amber-700 border-amber-200" },
};

// ── Calendrier horaires ─────────────────────────────────────────────────────
function ScheduleCalendar({
  year, month, schedule, stageStart, stageEnd, editingDate, isInstitution, unavailabilities, onSelect,
}: {
  year: number; month: number;
  schedule: ScheduleEntry[];
  stageStart: string; stageEnd: string;
  editingDate: string | null;
  isInstitution: boolean;
  unavailabilities: Unavailability[];
  onSelect: (date: string) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const days: (number | null)[] = [...Array(startDow).fill(null)];
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const schedMap = new Map(schedule.map(e => [e.date, e]));
  const unavailSet = new Set(unavailabilities.map(u => u.date));
  const stStart = new Date(stageStart).toISOString().slice(0, 10);
  const stEnd = new Date(stageEnd).toISOString().slice(0, 10);

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-stone-400 mb-1">
        {["Lu","Ma","Me","Je","Ve","Sa","Di"].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = dateStr(year, month, d);
          const inStage = ds >= stStart && ds <= stEnd;
          const entry = schedMap.get(ds);
          const isUnavail = unavailSet.has(ds);
          const isEditing = editingDate === ds;
          const dayOfWeek = new Date(ds).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          if (!inStage) {
            return <div key={i} className="text-[11px] text-center py-1.5 text-stone-200">{d}</div>;
          }

          return (
            <button key={i}
              onClick={() => isInstitution ? onSelect(ds) : undefined}
              disabled={!isInstitution}
              className={`relative text-[11px] rounded-lg py-1.5 px-0.5 transition-all leading-tight ${
                isEditing
                  ? "bg-sky-600 text-white ring-2 ring-sky-400"
                  : entry
                  ? "bg-sky-100 text-sky-800 font-medium hover:bg-sky-200"
                  : isUnavail
                  ? "bg-red-100 text-red-400"
                  : isWeekend
                  ? "text-stone-300 hover:bg-stone-100"
                  : isInstitution
                  ? "text-stone-600 hover:bg-stone-100 cursor-pointer"
                  : "text-stone-600"
              }`}>
              <div className="font-medium">{d}</div>
              {entry && (
                <div className={`text-[9px] leading-tight mt-0.5 ${isEditing ? "text-sky-200" : "text-sky-600"}`}>
                  {entry.start.slice(0, 5)}
                </div>
              )}
              {isUnavail && !entry && (
                <div className="text-[9px] text-red-400">indispo</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendrier indisponibilités ─────────────────────────────────────────────
function UnavailCalendar({
  year, month, unavailabilities, isStudent, onToggle,
}: {
  year: number; month: number;
  unavailabilities: Unavailability[];
  isStudent: boolean;
  onToggle: (date: string) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = [...Array(startDow).fill(null)];
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const unavailSet = new Set(unavailabilities.map(u => u.date));
  const approvedSet = new Set(unavailabilities.filter(u => u.status === "APPROVED").map(u => u.date));
  const rejectedSet = new Set(unavailabilities.filter(u => u.status === "REJECTED").map(u => u.date));

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-stone-400 mb-1">
        {["Lu","Ma","Me","Je","Ve","Sa","Di"].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = dateStr(year, month, d);
          const isUnavail = unavailSet.has(ds);
          const isApproved = approvedSet.has(ds);
          const isRejected = rejectedSet.has(ds);
          const isPast = new Date(ds) < new Date(new Date().toDateString());
          return (
            <button key={i}
              onClick={() => isStudent && !isPast && onToggle(ds)}
              disabled={(!isStudent) || (isPast && !isUnavail)}
              className={`text-[11px] rounded-lg py-1.5 transition-colors font-medium ${
                isApproved ? "bg-green-400 text-white"
                : isRejected ? "bg-red-300 text-white"
                : isUnavail ? "bg-red-500 text-white"
                : isPast ? "text-stone-200"
                : isStudent ? "hover:bg-orange-100 text-stone-600 cursor-pointer"
                : "text-stone-600"
              }`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function StagePage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const stageId = params.id as string;

  const [stage, setStage] = useState<StageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"horaires" | "documents" | "suivi">("horaires");
  const [toast, setToast] = useState("");

  // Schedule par date
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [schedCalYear, setSchedCalYear] = useState(new Date().getFullYear());
  const [schedCalMonth, setSchedCalMonth] = useState(new Date().getMonth());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("08:30");
  const [editEnd, setEditEnd] = useState("16:30");

  // Documents
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unavailability
  const [unavailCalYear, setUnavailCalYear] = useState(new Date().getFullYear());
  const [unavailCalMonth, setUnavailCalMonth] = useState(new Date().getMonth());
  const [showUnavailForm, setShowUnavailForm] = useState(false);
  const [unavailReason, setUnavailReason] = useState("");
  const [pendingDate, setPendingDate] = useState("");

  // Schedule requests
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestDesc, setRequestDesc] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // Stage status
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function load() {
    const res = await fetch(`/api/stage/${stageId}`);
    if (!res.ok) { router.push("/"); return; }
    const data: StageData = await res.json();
    setStage(data);
    try {
      const parsed = JSON.parse(data.weeklySchedule) || [];
      setSchedule(parsed);
    } catch { setSchedule([]); }
    // Init calendar sur le début du stage (ou mois courant si pas de date)
    if (data.slot?.startDate) {
      const start = new Date(data.slot.startDate);
      setSchedCalYear(start.getFullYear());
      setSchedCalMonth(start.getMonth());
      setUnavailCalYear(start.getFullYear());
      setUnavailCalMonth(start.getMonth());
    }
    setLoading(false);
  }

  useEffect(() => { if (status === "authenticated") load(); }, [status, stageId]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  const isInstitution = user?.role === "INSTITUTION";
  const isStudent = user?.role === "STUDENT";

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

  // Totaux horaires
  const totalH = schedule.reduce((s, e) => s + hoursFromEntry(e), 0);

  // Résumé par semaine
  const weekSummary = (() => {
    const map = new Map<string, number>();
    for (const e of schedule) {
      const d = new Date(e.date);
      const w = `${d.getFullYear()}-S${String(getISOWeek(d)).padStart(2, "0")}`;
      map.set(w, (map.get(w) || 0) + hoursFromEntry(e));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  })();

  async function saveSchedule() {
    setSavingSchedule(true);
    const res = await fetch(`/api/stage/${stageId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklySchedule: schedule }),
    });
    if (res.ok) notify("✅ Horaires sauvegardés");
    else notify("❌ Erreur lors de la sauvegarde");
    setSavingSchedule(false);
  }

  function selectDateForEdit(ds: string) {
    if (editingDate === ds) { setEditingDate(null); return; }
    const existing = schedule.find(e => e.date === ds);
    setEditStart(existing?.start || "08:30");
    setEditEnd(existing?.end || "16:30");
    setEditingDate(ds);
  }

  function applyDayEdit() {
    if (!editingDate) return;
    setSchedule(prev => {
      const filtered = prev.filter(e => e.date !== editingDate);
      if (editStart && editEnd) return [...filtered, { date: editingDate, start: editStart, end: editEnd }].sort((a, b) => a.date.localeCompare(b.date));
      return filtered;
    });
    setEditingDate(null);
  }

  function clearDay(ds: string) {
    setSchedule(prev => prev.filter(e => e.date !== ds));
    setEditingDate(null);
  }

  // Appliquer même horaire à tous les [lundi/mardi/...] du stage
  function applyToAllWeekday(weekday: number) {
    if (!stage || !stage.slot || !editingDate || !stage.slot.startDate || !stage.slot.endDate) return;
    const start = new Date(stage.slot.startDate);
    const end = new Date(stage.slot.endDate);
    const newEntries: ScheduleEntry[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === weekday) {
        newEntries.push({ date: cur.toISOString().slice(0, 10), start: editStart, end: editEnd });
      }
      cur.setDate(cur.getDate() + 1);
    }
    setSchedule(prev => {
      const weekdayDates = new Set(newEntries.map(e => e.date));
      const filtered = prev.filter(e => !weekdayDates.has(e.date));
      return [...filtered, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
    });
    notify(`✅ Horaire appliqué à tous les ${DOW_LONG[weekday]}s`);
  }

  // Navigation calendrier bornée aux mois du stage
  function canNavSchedPrev() {
    if (!stage?.slot?.startDate) return true;
    const start = new Date(stage.slot.startDate);
    return schedCalYear > start.getFullYear() || (schedCalYear === start.getFullYear() && schedCalMonth > start.getMonth());
  }
  function canNavSchedNext() {
    if (!stage?.slot?.endDate) return true;
    const end = new Date(stage.slot.endDate);
    return schedCalYear < end.getFullYear() || (schedCalYear === end.getFullYear() && schedCalMonth < end.getMonth());
  }
  function prevSchedMonth() {
    const d = new Date(schedCalYear, schedCalMonth - 1);
    setSchedCalYear(d.getFullYear()); setSchedCalMonth(d.getMonth());
  }
  function nextSchedMonth() {
    const d = new Date(schedCalYear, schedCalMonth + 1);
    setSchedCalYear(d.getFullYear()); setSchedCalMonth(d.getMonth());
  }

  async function toggleUnavailability(date: string) {
    const existing = stage?.unavailabilities.find(u => u.date === date);
    if (existing) {
      await fetch(`/api/stage/${stageId}/unavailability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      await load(); return;
    }
    setPendingDate(date);
    setShowUnavailForm(true);
  }

  async function submitUnavailability() {
    await fetch(`/api/stage/${stageId}/unavailability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: pendingDate, reason: unavailReason }),
    });
    await load(); notify("📅 Indisponibilité signalée");
    setShowUnavailForm(false); setUnavailReason(""); setPendingDate("");
  }

  async function respondUnavailability(unavailId: string, s: string) {
    await fetch(`/api/stage/${stageId}/unavailability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unavailId, status: s }),
    });
    await load(); notify(s === "APPROVED" ? "✅ Approuvée" : "❌ Refusée");
  }

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/stage/${stageId}/documents`, { method: "POST", body: fd });
    if (res.ok) { await load(); notify("✅ Document uploadé"); }
    else notify("❌ Erreur upload");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteDocument(docId: string) {
    await fetch(`/api/stage/${stageId}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    await load(); notify("🗑️ Document supprimé");
  }

  async function sendScheduleRequest() {
    if (!requestDesc.trim()) return;
    setSendingRequest(true);
    const res = await fetch(`/api/stage/${stageId}/schedule-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: requestDesc }),
    });
    if (res.ok) { await load(); notify("📤 Demande envoyée"); setShowRequestForm(false); setRequestDesc(""); }
    else notify("❌ Erreur");
    setSendingRequest(false);
  }

  async function respondScheduleRequest(requestId: string, s: string, note?: string) {
    await fetch(`/api/stage/${stageId}/schedule-request`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status: s, responseNote: note }),
    });
    await load(); notify(s === "APPROVED" ? "✅ Demande approuvée" : "❌ Demande refusée");
  }

  async function updateStageStatus(stageStatus: string) {
    setSavingStatus(true);
    await fetch(`/api/stage/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageStatus }),
    });
    await load(); notify("✅ Statut mis à jour");
    setSavingStatus(false);
  }

  if (status === "loading" || loading) return (
    <><Navbar /><div className="flex items-center justify-center h-64 text-stone-400">Chargement…</div></>
  );
  if (!stage) return null;

  const stStatus = stage.stageStatus ? stageStatusConfig[stage.stageStatus] : null;
  const pendingUnavail = stage.unavailabilities.filter(u => u.status === "PENDING");
  const pendingRequests = stage.scheduleRequests.filter(r => r.status === "PENDING");
  const editingEntry = editingDate ? schedule.find(e => e.date === editingDate) : null;
  const editingDow = editingDate ? new Date(editingDate).getDay() : null;

  return (
    <>
      <Navbar />

      {toast && (
        <div className="fixed top-5 right-5 z-[200] bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Modal indisponibilité */}
      {showUnavailForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-stone-900 mb-1">Signaler une indisponibilité</h3>
            <p className="text-xs text-stone-500 mb-4">{new Date(pendingDate).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}</p>
            <textarea rows={3} value={unavailReason} onChange={e => setUnavailReason(e.target.value)}
              placeholder="Raison (optionnel)"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setShowUnavailForm(false); setPendingDate(""); }}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">Annuler</button>
              <button onClick={submitUnavailability}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Signaler</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-400 mb-2">
                <Link href={isStudent ? "/student/applications" : "/institution/stagiaires"} className="hover:text-orange-500 transition-colors">← Retour</Link>
              </div>
              <h1 className="text-2xl font-medium text-stone-900">Suivi de stage</h1>
              <p className="text-stone-500 mt-0.5 text-sm">{stage.student.name || stage.student.email} · {stage.institution.name}</p>
              {stage.slot?.startDate && stage.slot?.endDate && <p className="text-xs text-stone-400 mt-1">📅 {fmt(stage.slot.startDate)} → {fmt(stage.slot.endDate)}</p>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {stStatus && (
                <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${stStatus.color}`}>{stStatus.label}</span>
              )}
              {totalH > 0 && (
                <div className="text-center bg-sky-50 border border-sky-200 rounded-xl px-4 py-2">
                  <p className="text-lg font-medium text-sky-700">{totalH.toFixed(1)}h</p>
                  <p className="text-xs text-sky-500">total planifié</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: "horaires", label: "📅 Horaires & Calendrier", badge: pendingUnavail.length },
            { key: "documents", label: "📄 Documents", badge: 0 },
            { key: "suivi", label: "⚙️ Suivi du stage", badge: pendingRequests.length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 h-11 rounded-xl text-sm font-medium transition-all ${tab === t.key ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"}`}>
              {t.label}
              {t.badge > 0 && <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab Horaires ──────────────────────────────────────────────────── */}
        {tab === "horaires" && (
          <div className="space-y-5">

            {/* Calendrier des horaires */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-medium text-stone-900">Planning du stage</h2>
                  {isInstitution && <p className="text-xs text-stone-400 mt-0.5">Cliquez sur un jour pour définir les horaires</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isInstitution && (
                    <button onClick={saveSchedule} disabled={savingSchedule}
                      className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                      {savingSchedule ? "Sauvegarde…" : "💾 Sauvegarder"}
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={prevSchedMonth} disabled={!canNavSchedPrev()}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 transition-colors flex items-center justify-center text-sm">‹</button>
                    <span className="text-sm font-medium text-stone-700 min-w-[110px] text-center">{MONTHS[schedCalMonth]} {schedCalYear}</span>
                    <button onClick={nextSchedMonth} disabled={!canNavSchedNext()}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 transition-colors flex items-center justify-center text-sm">›</button>
                  </div>
                </div>
              </div>

              {/* Légende */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-stone-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-200 inline-block"/>{isInstitution ? "Planifié" : "Jour planifié"}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-600 inline-block"/>Sélectionné</span>
                {stage.unavailabilities.length > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block"/>Indisponibilité signalée</span>}
              </div>

              <ScheduleCalendar
                year={schedCalYear} month={schedCalMonth}
                schedule={schedule}
                stageStart={stage.slot?.startDate || "2000-01-01"}
                stageEnd={stage.slot?.endDate || "2099-12-31"}
                editingDate={editingDate}
                isInstitution={isInstitution}
                unavailabilities={stage.unavailabilities}
                onSelect={selectDateForEdit}
              />

              {/* Panneau d'édition du jour sélectionné */}
              {isInstitution && editingDate && (
                <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-sky-900">
                        {new Date(editingDate).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {editingEntry && (
                        <p className="text-xs text-sky-600 mt-0.5">{hoursFromEntry({ ...editingEntry, start: editStart, end: editEnd }).toFixed(1)}h planifiées</p>
                      )}
                    </div>
                    <button onClick={() => setEditingDate(null)} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 mb-3">
                    <div className="flex-1 w-full">
                      <label className="text-xs text-stone-500 mb-1 block">Heure de début</label>
                      <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                        className="w-full border border-sky-200 bg-white rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div className="hidden sm:block text-stone-300 pb-2.5">→</div>
                    <div className="flex-1 w-full">
                      <label className="text-xs text-stone-500 mb-1 block">Heure de fin</label>
                      <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                        className="w-full border border-sky-200 bg-white rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                      <button onClick={applyDayEdit}
                        className="flex-1 sm:flex-none bg-sky-600 hover:bg-sky-700 text-white text-xs px-4 h-11 rounded-xl font-medium transition-colors whitespace-nowrap">
                        ✓ Appliquer
                      </button>
                      {editingEntry && (
                        <button onClick={() => clearDay(editingDate)}
                          className="flex-1 sm:flex-none border border-red-200 text-red-500 text-xs px-4 h-11 rounded-xl hover:bg-red-50 transition-colors whitespace-nowrap">
                          🗑 Effacer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Appliquer à tous les [jour] */}
                  {editingDow !== null && (
                    <div className="border-t border-sky-200 pt-3">
                      <p className="text-xs text-sky-700 mb-2">Répliquer cet horaire sur tous les <strong>{DOW_LONG[editingDow]}s</strong> du stage :</p>
                      <button onClick={() => applyToAllWeekday(editingDow)}
                        className="text-xs bg-white border border-sky-300 text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-colors font-medium">
                        Appliquer à tous les {DOW_LONG[editingDow]}s
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Récapitulatif par semaine */}
            {schedule.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h2 className="text-base font-medium text-stone-900 mb-4">Récapitulatif</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-medium text-sky-700">{totalH.toFixed(1)}h</p>
                    <p className="text-xs text-sky-500 mt-0.5">Total planifié</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-medium text-stone-700">{schedule.length}</p>
                    <p className="text-xs text-stone-400 mt-0.5">Jours planifiés</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Par semaine</p>
                  {weekSummary.map(([week, hours]) => (
                    <div key={week} className="flex items-center justify-between px-3 py-2 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-600">{week.replace("-S", " — semaine ")}</span>
                      <span className="text-xs font-medium text-sky-700">{hours.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendrier indisponibilités */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-medium text-stone-900">
                    {isStudent ? "Mes indisponibilités" : "Indisponibilités de l'étudiant"}
                  </h2>
                  {isStudent && <p className="text-xs text-stone-400 mt-0.5">Cliquez sur un jour pour signaler une indisponibilité</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { const d = new Date(unavailCalYear, unavailCalMonth - 1); setUnavailCalYear(d.getFullYear()); setUnavailCalMonth(d.getMonth()); }}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors flex items-center justify-center text-sm">‹</button>
                  <span className="text-sm font-medium text-stone-700 min-w-[130px] text-center">{MONTHS[unavailCalMonth]} {unavailCalYear}</span>
                  <button onClick={() => { const d = new Date(unavailCalYear, unavailCalMonth + 1); setUnavailCalYear(d.getFullYear()); setUnavailCalMonth(d.getMonth()); }}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors flex items-center justify-center text-sm">›</button>
                </div>
              </div>

              <UnavailCalendar
                year={unavailCalYear} month={unavailCalMonth}
                unavailabilities={stage.unavailabilities}
                isStudent={isStudent}
                onToggle={toggleUnavailability}
              />

              {/* Légende indisponibilités */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-stone-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block"/>En attente</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400 inline-block"/>Approuvée</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-300 inline-block"/>Refusée</span>
              </div>

              {/* Demandes en attente (institution) */}
              {isInstitution && pendingUnavail.length > 0 && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-3">En attente d'approbation ({pendingUnavail.length})</p>
                  <div className="space-y-2">
                    {pendingUnavail.map(u => (
                      <div key={u.id} className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-stone-800">{new Date(u.date).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}</p>
                          {u.reason && <p className="text-xs text-stone-500">{u.reason}</p>}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => respondUnavailability(u.id, "APPROVED")} className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700">✓</button>
                          <button onClick={() => respondUnavailability(u.id, "REJECTED")} className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">✗</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Liste pour l'étudiant */}
              {isStudent && stage.unavailabilities.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {stage.unavailabilities.map(u => (
                    <div key={u.id} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${
                      u.status === "APPROVED" ? "bg-green-50 border-green-200 text-green-700" :
                      u.status === "REJECTED" ? "bg-red-50 border-red-200 text-red-600" :
                      "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      <span>{new Date(u.date).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="font-medium">{u.status === "APPROVED" ? "✓ Approuvée" : u.status === "REJECTED" ? "✗ Refusée" : "⏳ En attente"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab Documents ─────────────────────────────────────────────────── */}
        {tab === "documents" && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h2 className="text-base font-medium text-stone-900 mb-1">Convention de stage & documents</h2>
              <p className="text-xs text-stone-400 mb-4">PDF, Word (.docx), ou tout autre format</p>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${uploading ? "border-sky-300 bg-sky-50" : "border-stone-200 hover:border-orange-300 hover:bg-orange-50"}`}>
                <span className="text-3xl mb-2">{uploading ? "⏳" : "⬆️"}</span>
                <span className="text-sm font-medium text-stone-700">{uploading ? "Envoi en cours…" : "Cliquer pour déposer un document"}</span>
                <span className="text-xs text-stone-400 mt-1">PDF, DOC, DOCX, PNG, JPG</span>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={uploadDocument} disabled={uploading} />
              </label>
            </div>

            {stage.stageDocuments.length === 0 ? (
              <div className="text-center py-8 text-stone-300"><p className="text-3xl mb-2">📄</p><p className="text-sm">Aucun document déposé</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Documents ({stage.stageDocuments.length})</p>
                {stage.stageDocuments.map(doc => {
                  const ext = doc.name.split(".").pop()?.toUpperCase() || "FILE";
                  return (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">{ext === "PDF" ? "📕" : ["DOC","DOCX"].includes(ext) ? "📘" : "📄"}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{doc.name}</p>
                          <p className="text-xs text-stone-400">{new Date(doc.createdAt).toLocaleDateString("fr-BE")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={doc.path} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors font-medium">⬇ Télécharger</a>
                        <button onClick={() => deleteDocument(doc.id)} className="text-xs text-stone-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab Suivi ─────────────────────────────────────────────────────── */}
        {tab === "suivi" && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h2 className="text-base font-medium text-stone-900 mb-3">Statut du stage</h2>
              {stStatus ? (
                <div className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border font-medium ${stStatus.color}`}>{stStatus.label}</div>
              ) : <p className="text-sm text-stone-400 italic">Aucun statut défini</p>}
            </div>

            {isInstitution && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h2 className="text-base font-medium text-stone-900 mb-1">Actions sur le stage</h2>
                <p className="text-xs text-stone-400 mb-4">Ces actions sont définitives et visibles par l'étudiant</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { status: "COMPLETED", emoji: "✅", label: "Valider le stage", cls: "border-green-200 bg-green-50 hover:bg-green-100 text-green-700" },
                    { status: "NOT_VALIDATED", emoji: "❌", label: "Ne pas valider", cls: "border-red-200 bg-red-50 hover:bg-red-100 text-red-600" },
                    { status: "STOPPED", emoji: "⏹", label: "Stopper le stage", cls: "border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700" },
                  ].map(a => (
                    <button key={a.status} onClick={() => updateStageStatus(a.status)}
                      disabled={savingStatus || stage.stageStatus === a.status}
                      className={`flex flex-row sm:flex-col items-center gap-3 sm:gap-2 p-4 rounded-xl border-2 transition-colors disabled:opacity-40 ${a.cls}`}>
                      <span className="text-2xl">{a.emoji}</span>
                      <span className="text-xs font-medium text-center">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-stone-900">Demandes de changement d'horaire</h2>
                {isStudent && (
                  <button onClick={() => setShowRequestForm(!showRequestForm)}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                    + Nouvelle demande
                  </button>
                )}
              </div>

              {showRequestForm && isStudent && (
                <div className="mb-4 bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <textarea rows={3} value={requestDesc} onChange={e => setRequestDesc(e.target.value)}
                    placeholder="Ex: Je voudrais décaler ma journée du lundi au mardi…"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowRequestForm(false); setRequestDesc(""); }}
                      className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2 text-xs hover:bg-stone-50">Annuler</button>
                    <button onClick={sendScheduleRequest} disabled={!requestDesc.trim() || sendingRequest}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-xs font-medium disabled:opacity-50">
                      {sendingRequest ? "Envoi…" : "Envoyer"}
                    </button>
                  </div>
                </div>
              )}

              {stage.scheduleRequests.length === 0 ? (
                <p className="text-sm text-stone-300 italic text-center py-4">Aucune demande de changement</p>
              ) : (
                <div className="space-y-3">
                  {stage.scheduleRequests.map(req => (
                    <div key={req.id} className={`p-4 rounded-xl border ${
                      req.status === "APPROVED" ? "bg-green-50 border-green-200" :
                      req.status === "REJECTED" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm text-stone-800">{req.description}</p>
                        <span className={`text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full ${
                          req.status === "APPROVED" ? "bg-green-200 text-green-800" :
                          req.status === "REJECTED" ? "bg-red-200 text-red-700" : "bg-amber-200 text-amber-800"}`}>
                          {req.status === "APPROVED" ? "Approuvée" : req.status === "REJECTED" ? "Refusée" : "En attente"}
                        </span>
                      </div>
                      {req.responseNote && <p className="text-xs text-stone-500 mt-1 italic">Réponse : {req.responseNote}</p>}
                      <p className="text-xs text-stone-400 mt-1">{new Date(req.createdAt).toLocaleDateString("fr-BE")}</p>
                      {isInstitution && req.status === "PENDING" && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => respondScheduleRequest(req.id, "APPROVED")}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded-lg font-medium transition-colors">✓ Approuver</button>
                          <button onClick={() => respondScheduleRequest(req.id, "REJECTED")}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 rounded-lg font-medium transition-colors">✗ Refuser</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
