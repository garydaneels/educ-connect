"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface RecentApp {
  id: string;
  status: string;
  stageStatus?: string;
  createdAt: string;
  student: { id: string; name?: string; email: string };
}

interface MonthStat { label: string; count: number }

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  active: number;
  completed: number;
  views: number;
  availablePlaces: number;
  totalPlaces: number;
  recentApps: RecentApp[];
  monthly: MonthStat[];
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:   { label: "En attente",   color: "bg-amber-50 text-amber-700",  dot: "bg-amber-400" },
  ACCEPTED:  { label: "Acceptée",     color: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  REJECTED:  { label: "Refusée",      color: "bg-red-50 text-red-600",      dot: "bg-red-400" },
  COMPLETED: { label: "Stage trouvé", color: "bg-sky-50 text-sky-700",      dot: "bg-sky-500" },
};


export default function InstitutionDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/institution/stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStats(data); setLoading(false); });
  }, [status]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });

  if (status === "loading" || loading) return null;

  const maxMonthly = stats ? Math.max(...stats.monthly.map(m => m.count), 1) : 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-5 py-8 w-full">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">Tableau de bord</h1>
            <p className="text-stone-500 text-sm mt-0.5">Vue d'ensemble de votre activité sur Educ-Connect</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/institution/applications"
              className="text-sm border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 px-4 py-2 rounded-xl font-medium transition-colors">
              Candidatures stages →
            </Link>
            <Link href="/institution/job-applications"
              className="text-sm border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-medium transition-colors">
              Candidatures jobs →
            </Link>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: "📨", label: "Candidatures reçues", value: stats?.total ?? 0, color: "text-stone-900", sub: `${stats?.pending ?? 0} en attente` },
            { icon: "✅", label: "Acceptées", value: stats?.accepted ?? 0, color: "text-green-600", sub: stats?.total ? `${Math.round((stats.accepted / stats.total) * 100)}% d'acceptation` : "—" },
            { icon: "🎓", label: "Stagiaires actifs", value: stats?.active ?? 0, color: "text-sky-600", sub: `${stats?.completed ?? 0} stage(s) terminé(s)` },
            { icon: "👁", label: "Vues sur votre fiche", value: stats?.views ?? 0, color: "text-orange-500", sub: `${stats?.availablePlaces ?? 0} place(s) dispo.` },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className={`text-3xl font-semibold ${card.color}`}>{card.value}</p>
              <p className="text-xs font-medium text-stone-600 mt-1">{card.label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Graphique candidatures / mois */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="text-base font-medium text-stone-900 mb-5">📈 Candidatures — 6 derniers mois</h2>
            {stats && stats.monthly.every(m => m.count === 0) ? (
              <div className="flex items-center justify-center h-32 text-stone-300 text-sm italic">
                Aucune candidature sur cette période
              </div>
            ) : (
              <div className="flex items-end gap-3 h-36">
                {stats?.monthly.map(m => (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-medium text-stone-600">{m.count > 0 ? m.count : ""}</span>
                    <div className="w-full rounded-t-lg bg-orange-100 relative overflow-hidden" style={{ height: "88px" }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all duration-700"
                        style={{ height: `${(m.count / maxMonthly) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400">{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Répartition statuts */}
            {stats && stats.total > 0 && (
              <div className="mt-5 pt-5 border-t border-stone-50">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Répartition des candidatures</p>
                <div className="flex gap-2 mb-3">
                  {[
                    { key: "accepted", color: "bg-green-400" },
                    { key: "pending",  color: "bg-amber-400" },
                    { key: "rejected", color: "bg-red-300" },
                  ].filter(b => (stats as unknown as Record<string, number>)[b.key] > 0).map(b => {
                    const count = (stats as unknown as Record<string, number>)[b.key];
                    const pct = Math.round((count / stats.total) * 100);
                    return (
                      <div key={b.key} className="flex-1 h-2 rounded-full overflow-hidden bg-stone-100">
                        <div className={`h-full ${b.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 text-xs text-stone-500">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />{stats.accepted} acceptée{stats.accepted > 1 ? "s" : ""}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />{stats.pending} en attente</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-red-300 mr-1" />{stats.rejected} refusée{stats.rejected > 1 ? "s" : ""}</span>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-5">

            {/* Stages complétés */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h2 className="text-base font-medium text-stone-900 mb-4">🎓 Stages complétés</h2>
              <div className="text-center py-2">
                <p className="text-5xl font-semibold text-green-600">{stats?.completed ?? 0}</p>
                <p className="text-sm text-stone-500 mt-3">stage{(stats?.completed ?? 0) > 1 ? "s" : ""} terminé{(stats?.completed ?? 0) > 1 ? "s" : ""} avec succès</p>
              </div>
            </div>

            {/* Places */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h2 className="text-sm font-medium text-stone-900 mb-3">🪑 Places de stage</h2>
              {stats && stats.totalPlaces > 0 ? (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-stone-500">Disponibles</span>
                    <span className="font-medium text-stone-900">{stats.availablePlaces} / {stats.totalPlaces}</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                      style={{ width: `${(stats.availablePlaces / stats.totalPlaces) * 100}%` }} />
                  </div>
                  <p className="text-xs text-stone-400 mt-2">
                    {Math.round((stats.availablePlaces / stats.totalPlaces) * 100)}% de places libres
                  </p>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-stone-400 italic">Aucune période de stage définie.</p>
                  <Link href="/institution" className="text-xs text-sky-600 hover:underline mt-1 inline-block">
                    Ajouter des places →
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Dernières candidatures */}
        <div className="mt-6 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
            <h2 className="text-base font-medium text-stone-900">🕐 Dernières candidatures</h2>
            <Link href="/institution/applications" className="text-xs text-sky-600 hover:underline font-medium">
              Voir toutes →
            </Link>
          </div>
          {!stats?.recentApps?.length ? (
            <div className="px-6 py-10 text-center text-stone-400 text-sm italic">Aucune candidature reçue pour le moment.</div>
          ) : (
            <div className="divide-y divide-stone-50">
              {stats.recentApps.map(app => {
                const sc = statusConfig[app.status] ?? { label: app.status, color: "bg-stone-50 text-stone-600", dot: "bg-stone-400" };
                return (
                  <div key={app.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-stone-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {app.student.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{app.student.name ?? "—"}</p>
                      <p className="text-xs text-stone-400">{fmtDate(app.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot} mr-1.5`} />
                      {sc.label}
                    </span>
                    <Link href="/institution/applications"
                      className="text-xs text-stone-400 hover:text-sky-600 transition-colors font-medium">
                      Voir →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}
