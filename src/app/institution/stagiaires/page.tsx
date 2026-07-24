"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface Stagiaire {
  id: string;
  stageStatus: string;
  weeklySchedule: string;
  slot: { startDate?: string | null; endDate?: string | null; description?: string | null };
  student: { id: string; name?: string; email: string };
}

interface ScheduleEntry { day: string; start: string; end: string; }

function hoursFromEntry(e: ScheduleEntry) {
  if (!e.start || !e.end) return 0;
  const [sh, sm] = e.start.split(":").map(Number);
  const [eh, em] = e.end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ONGOING:       { label: "En cours",      color: "bg-sky-50 text-sky-700 border-sky-200" },
  COMPLETED:     { label: "Validé ✅",     color: "bg-green-50 text-green-700 border-green-200" },
  NOT_VALIDATED: { label: "Non validé ❌", color: "bg-red-50 text-red-700 border-red-200" },
  STOPPED:       { label: "Arrêté ⏹",      color: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function StagiairesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ONGOING" | "ALL">("ONGOING");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/applications")
      .then(r => r.json())
      .then((data: Stagiaire[]) => {
        const withStage = data.filter(a => a.stageStatus);
        setStagiaires(withStage);
        setLoading(false);
      });
  }, [status]);

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

  const filtered = filter === "ONGOING"
    ? stagiaires.filter(s => s.stageStatus === "ONGOING")
    : stagiaires;

  const counts = {
    ONGOING: stagiaires.filter(s => s.stageStatus === "ONGOING").length,
    ALL: stagiaires.length,
  };

  if (status === "loading" || loading) return (
    <>
      <Navbar />
      <div className="flex items-center justify-center h-64 text-stone-400">Chargement…</div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-medium text-stone-900">Mes stagiaires</h1>
          <p className="text-stone-500 text-sm mt-1">Suivez les étudiants actuellement en stage dans votre institution.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
            <p className="text-3xl font-medium text-sky-700">{counts.ONGOING}</p>
            <p className="text-xs text-sky-500 mt-1">Stage en cours</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-4">
            <p className="text-3xl font-medium text-stone-900">{counts.ALL}</p>
            <p className="text-xs text-stone-400 mt-1">Total stagiaires</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-3xl font-medium text-green-700">{stagiaires.filter(s => s.stageStatus === "COMPLETED").length}</p>
            <p className="text-xs text-green-500 mt-1">Stages validés</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setFilter("ONGOING")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === "ONGOING" ? "bg-sky-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-sky-300"}`}>
            En cours <span className="ml-1 opacity-70">{counts.ONGOING}</span>
          </button>
          <button onClick={() => setFilter("ALL")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === "ALL" ? "bg-sky-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-sky-300"}`}>
            Tous <span className="ml-1 opacity-70">{counts.ALL}</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm">
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-stone-700 font-medium mb-1">
              {filter === "ONGOING" ? "Aucun stagiaire en cours" : "Aucun stagiaire pour l'instant"}
            </p>
            <p className="text-stone-400 text-sm mb-5">
              Acceptez des candidatures pour démarrer un suivi de stage.
            </p>
            <Link href="/institution/applications"
              className="bg-sky-600 hover:bg-sky-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors">
              Voir les candidatures →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(s => {
              let schedule: ScheduleEntry[] = [];
              try { schedule = JSON.parse(s.weeklySchedule) || []; } catch { schedule = []; }
              const weeklyH = schedule.reduce((sum, e) => sum + hoursFromEntry(e), 0);
              const st = statusConfig[s.stageStatus] || statusConfig.ONGOING;

              return (
                <Link key={s.id} href={`/stage/${s.id}`}
                  className="group bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-medium text-sm flex-shrink-0">
                        {(s.student.name || s.student.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900 text-sm">{s.student.name || s.student.email}</p>
                        <p className="text-xs text-stone-400">{s.student.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  {(s.slot.startDate || s.slot.description) && (
                    <div className="text-xs text-stone-500 mb-3">
                      {s.slot.startDate
                        ? `📅 ${fmt(s.slot.startDate)} → ${fmt(s.slot.endDate ?? "")}`
                        : s.slot.description}
                    </div>
                  )}

                  {weeklyH > 0 && (
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="bg-stone-100 rounded-lg px-2.5 py-1 text-stone-600 font-medium">{weeklyH.toFixed(1)}h / semaine</span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-stone-400 group-hover:text-sky-600 transition-colors font-medium">
                      Ouvrir le suivi →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
