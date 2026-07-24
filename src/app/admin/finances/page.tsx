"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

/* ── Types ────────────────────────────────────────────────────────────── */
interface MonthData {
  key: string;
  label: string;
  revenue: number;
  newSubs: number;
  activeSubs: number;
  newInstitutions: number;
  newApplications: number;
}

interface Transaction {
  id: string;
  institutionName: string;
  plan: string;
  price: number;
  status: string;
  date: string;
}

interface FinanceData {
  summary: {
    totalRevenue: number;
    activeSubscriptions: number;
    totalSubscriptions: number;
    pendingPayments: number;
    avgRevenuePerSub: number;
    annualProjection: number;
    revenueGrowth: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    totalInstitutions: number;
    totalApplications: number;
    stagesFound: number;
    conversionRate: number;
  };
  byPlan: {
    MONTHLY:   { count: number; revenue: number; active: number };
    QUARTERLY: { count: number; revenue: number; active: number };
    SEMESTER:  { count: number; revenue: number; active: number };
    ANNUAL:    { count: number; revenue: number; active: number };
    SCHOOL:    { count: number; revenue: number; active: number };
  };
  months: MonthData[];
  recentTransactions: Transaction[];
}

/* ── Graphique barres SVG ─────────────────────────────────────────────── */
function BarChart({ data, valueKey, colorClass = "fill-sky-500", height = 160 }: {
  data: MonthData[];
  valueKey: keyof MonthData;
  colorClass?: string;
  height?: number;
}) {
  const values = data.map(d => Number(d[valueKey]));
  const maxVal = Math.max(...values, 1);

  return (
    <svg viewBox={`0 0 ${data.length * 40} ${height + 28}`} className="w-full">
      {values.map((v, i) => {
        const barH = Math.max((v / maxVal) * height, v > 0 ? 4 : 0);
        const x = i * 40 + 4;
        const y = height - barH;
        const isLast = i === values.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={32} height={barH}
              className={isLast ? "fill-orange-400" : colorClass}
              rx={4} opacity={isLast ? 1 : 0.75} />
            {v > 0 && (
              <text x={x + 16} y={y - 4} textAnchor="middle" fontSize={9}
                className="fill-stone-400">
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              </text>
            )}
            <text x={x + 16} y={height + 18} textAnchor="middle" fontSize={8.5}
              className="fill-stone-400">
              {data[i].label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Graphique ligne SVG ──────────────────────────────────────────────── */
function LineChart({ data, valueKey, color = "#0ea5e9" }: {
  data: MonthData[];
  valueKey: keyof MonthData;
  color?: string;
}) {
  const W = 480;
  const H = 120;
  const PAD = 8;
  const values = data.map(d => Number(d[valueKey]));
  const maxVal = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / maxVal) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`;

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#grad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - (v / maxVal) * (H - PAD * 2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill={color} />
            <text x={x} y={H + 14} textAnchor="middle" fontSize={8.5} fill="#a8a29e">
              {data[i].label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Donut plan ───────────────────────────────────────────────────────── */
function PlanDonut({ monthly, quarterly, semester, annual, school }: { monthly: number; quarterly: number; semester: number; annual: number; school: number }) {
  const total = monthly + quarterly + semester + annual + school || 1;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const segments = [
    { count: monthly,   color: "#38bdf8" }, // sky
    { count: quarterly, color: "#fb923c" }, // orange
    { count: semester,  color: "#818cf8" }, // indigo
    { count: annual,    color: "#a78bfa" }, // violet
    { count: school,    color: "#34d399" }, // emerald
  ];
  let offset = circ / 4;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e7e5e4" strokeWidth="14" />
      {segments.map((seg, i) => {
        const dash = (seg.count / total) * circ;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={seg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset} strokeLinecap="butt" />
        );
        offset -= dash;
        return el;
      })}
      <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1c1917">{total}</text>
      <text x="50" y="58" textAnchor="middle" fontSize="7.5" fill="#a8a29e">abonnements</text>
    </svg>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, trend, trendUp }: {
  icon: string; label: string; value: string; sub?: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {trendUp ? "▲" : "▼"} {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-medium text-stone-900 mb-0.5">{value}</p>
      <p className="text-xs text-stone-500 font-medium">{label}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function FinancesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"revenue" | "subs" | "institutions" | "applications">("revenue");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "ADMIN") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    fetch("/api/admin/finances").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const fmt = (n: number) => n.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });

  if (status === "loading" || loading || !data) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen text-stone-400 text-sm">Chargement des données…</div>
      </>
    );
  }

  const { summary, byPlan, months, recentTransactions } = data;

  const chartKey = period === "revenue" ? "revenue" : period === "subs" ? "newSubs" : period === "institutions" ? "newInstitutions" : "newApplications";
  const chartColor = period === "revenue" ? "fill-orange-400" : period === "subs" ? "fill-sky-500" : period === "institutions" ? "fill-purple-500" : "fill-green-500";

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* En-tête */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/admin" className="text-stone-400 hover:text-stone-600 text-sm transition-colors">
                ← Administration
              </Link>
            </div>
            <h1 className="text-2xl font-medium text-stone-900">Tableau de bord financier</h1>
            <p className="text-stone-500 text-sm mt-0.5">Vue d'ensemble des revenus, abonnements et croissance d'Educ-Connect.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">Dernière mise à jour</p>
            <p className="text-sm text-stone-600 font-medium">{new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* ── KPI principaux ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon="💶"
            label="Chiffre d'affaires total"
            value={`${fmt(summary.totalRevenue)} €`}
            sub={`${summary.totalSubscriptions} abonnements réglés`}
          />
          <KpiCard
            icon="📈"
            label="Projection annuelle"
            value={`${summary.annualProjection.toLocaleString("fr-BE")} €`}
            sub="Basée sur les 3 derniers mois"
            trend={summary.revenueGrowth !== 0 ? `${Math.abs(summary.revenueGrowth)}% vs mois dernier` : undefined}
            trendUp={summary.revenueGrowth >= 0}
          />
          <KpiCard
            icon="⭐"
            label="Abonnements actifs"
            value={String(summary.activeSubscriptions)}
            sub={`${summary.pendingPayments} en attente de paiement`}
          />
          <KpiCard
            icon="💰"
            label="Revenu moyen / abonnement"
            value={`${fmt(summary.avgRevenuePerSub)} €`}
            sub="Tous abonnements confondus"
          />
        </div>

        {/* ── Ce mois / mois dernier ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-4">Ce mois-ci</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-medium text-stone-900">{fmt(summary.thisMonthRevenue)} €</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${summary.revenueGrowth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {summary.revenueGrowth >= 0 ? "▲" : "▼"} {Math.abs(summary.revenueGrowth)}%
              </span>
              <span className="text-xs text-stone-400">vs {fmt(summary.lastMonthRevenue)} € le mois dernier</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-4">Répartition des plans</p>
            <div className="flex items-center gap-5">
              <PlanDonut monthly={byPlan.MONTHLY.count} quarterly={byPlan.QUARTERLY.count} semester={byPlan.SEMESTER.count} annual={byPlan.ANNUAL.count} school={byPlan.SCHOOL.count} />
              <div className="space-y-2.5">
                {[
                  { key: "MONTHLY",   color: "bg-sky-400",     label: "Mensuel (19€)" },
                  { key: "QUARTERLY", color: "bg-orange-400",  label: "Trimestriel (49€)" },
                  { key: "SEMESTER",  color: "bg-indigo-400",  label: "Semestriel (89€)" },
                  { key: "ANNUAL",    color: "bg-violet-400",  label: "Annuel (149€)" },
                  { key: "SCHOOL",    color: "bg-emerald-400", label: "Scolaire (109€)" },
                ].map(p => (
                  <div key={p.key} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${p.color} flex-shrink-0`}></span>
                    <div>
                      <p className="text-xs font-medium text-stone-700">{p.label}</p>
                      <p className="text-xs text-stone-400">
                        {byPlan[p.key as keyof typeof byPlan].count} · {fmt(byPlan[p.key as keyof typeof byPlan].revenue)} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-4">Activité plateforme</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">🏛️ Institutions totales</span>
                <span className="font-medium text-stone-900">{summary.totalInstitutions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">📩 Candidatures reçues</span>
                <span className="font-medium text-stone-900">{summary.totalApplications}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">🏆 Stages trouvés</span>
                <span className="font-medium text-green-600">{summary.stagesFound}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">📊 Taux de conversion</span>
                <span className="font-medium text-sky-600">{summary.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Graphique principal ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-medium text-stone-900">Évolution mensuelle</h2>
              <p className="text-xs text-stone-400 mt-0.5">12 derniers mois · Le mois en cours est surligné</p>
            </div>
            <div className="flex flex-wrap gap-1.5 bg-stone-100 rounded-xl p-1">
              {([
                { key: "revenue",      label: "Revenus" },
                { key: "subs",         label: "Abonnements" },
                { key: "institutions", label: "Inscriptions" },
                { key: "applications", label: "Candidatures" },
              ] as const).map(opt => (
                <button key={opt.key} onClick={() => setPeriod(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === opt.key ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Valeur actuelle mise en avant */}
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-medium text-stone-900">
              {period === "revenue"
                ? `${fmt(months[months.length - 1].revenue)} €`
                : period === "subs"
                ? months[months.length - 1].newSubs
                : period === "institutions"
                ? months[months.length - 1].newInstitutions
                : months[months.length - 1].newApplications}
            </span>
            <span className="text-sm text-stone-400">ce mois-ci</span>
          </div>

          <BarChart data={months} valueKey={chartKey as keyof MonthData} colorClass={chartColor} height={140} />
        </div>

        {/* ── Abonnements actifs et ligne ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="font-medium text-stone-900 mb-1">Abonnements actifs par mois</h2>
            <p className="text-xs text-stone-400 mb-4">Nombre d'institutions visibles chaque mois</p>
            <LineChart data={months} valueKey="activeSubs" color="#0ea5e9" />
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="font-medium text-stone-900 mb-1">Nouvelles inscriptions</h2>
            <p className="text-xs text-stone-400 mb-4">Institutions créant un compte sur la plateforme</p>
            <LineChart data={months} valueKey="newInstitutions" color="#a855f7" />
          </div>
        </div>

        {/* ── Transactions récentes ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-x-auto">
          <div className="px-6 py-4 border-b border-stone-50 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-stone-900">Transactions récentes</h2>
              <p className="text-xs text-stone-400 mt-0.5">10 derniers paiements reçus</p>
            </div>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-stone-300">
              <p className="text-4xl mb-2">💳</p>
              <p className="text-sm">Aucune transaction enregistrée</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Statut</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Montant</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, i) => {
                  const rowBg = i % 2 === 0 ? "bg-white" : "bg-stone-50/50";
                  return (
                  <tr key={tx.id} className={rowBg}>
                    <td className="px-6 py-3.5 font-medium text-stone-900">{tx.institutionName}</td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {tx.plan === "MONTHLY" ? "📆 Mensuel" : tx.plan === "QUARTERLY" ? "📅 Trimestriel" : tx.plan === "SEMESTER" ? "📓 Semestriel" : tx.plan === "ANNUAL" ? "🗓️ Annuel" : tx.plan === "SCHOOL" ? "🏫 Scolaire" : tx.plan}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        tx.status === "ACTIVE" ? "bg-green-50 text-green-700"
                        : tx.status === "EXPIRED" ? "bg-stone-100 text-stone-500"
                        : "bg-amber-50 text-amber-700"}`}>
                        {tx.status === "ACTIVE" ? "Actif" : tx.status === "EXPIRED" ? "Expiré" : tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-stone-900">{fmt(tx.price ?? 0)} €</td>
                    <td className="px-6 py-3.5 text-right text-stone-400">{fmtDate(tx.date)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  );
}
