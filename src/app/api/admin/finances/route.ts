import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const now = new Date();
  const startOf12MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [subscriptions, institutions, applications] = await Promise.all([
    prisma.subscription.findMany({
      include: { institution: { select: { name: true, boosted: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.institution.findMany({
      select: { id: true, boosted: true, boostEndDate: true, createdAt: true },
    }),
    prisma.application.findMany({
      select: { status: true, createdAt: true },
    }),
  ]);

  // ── Revenus abonnements ──────────────────────────────────────────────────
  const activeSubs = subscriptions.filter(s => s.status === "ACTIVE");
  const totalRevenue = subscriptions
    .filter(s => s.price != null && s.status !== "PENDING_PAYMENT")
    .reduce((acc, s) => acc + (s.price ?? 0), 0);

  // ── Répartition par plan ─────────────────────────────────────────────────
  const byPlan = {
    MONTHLY:   subscriptions.filter(s => s.plan === "MONTHLY"   && s.status !== "PENDING_PAYMENT"),
    QUARTERLY: subscriptions.filter(s => s.plan === "QUARTERLY" && s.status !== "PENDING_PAYMENT"),
    SEMESTER:  subscriptions.filter(s => s.plan === "SEMESTER"  && s.status !== "PENDING_PAYMENT"),
    ANNUAL:    subscriptions.filter(s => s.plan === "ANNUAL"    && s.status !== "PENDING_PAYMENT"),
    SCHOOL:    subscriptions.filter(s => s.plan === "SCHOOL"    && s.status !== "PENDING_PAYMENT"),
  };

  // ── Données mensuelles (12 derniers mois) ────────────────────────────────
  const months: { key: string; label: string; revenue: number; newSubs: number; activeSubs: number; newInstitutions: number; newApplications: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-BE", { month: "short", year: "2-digit" });

    const monthSubs = subscriptions.filter(s => {
      const created = new Date(s.createdAt);
      return created >= d && created < nextD && s.status !== "PENDING_PAYMENT";
    });

    const activeThisMonth = subscriptions.filter(s => {
      if (s.status !== "ACTIVE") return false;
      const start = s.startDate ? new Date(s.startDate) : new Date(s.createdAt);
      const end = s.endDate ? new Date(s.endDate) : new Date("2099-01-01");
      return start <= nextD && end >= d;
    });

    const newInst = institutions.filter(inst => {
      const created = new Date(inst.createdAt);
      return created >= d && created < nextD;
    });

    const newApps = applications.filter(app => {
      const created = new Date(app.createdAt);
      return created >= d && created < nextD;
    });

    months.push({
      key,
      label,
      revenue: monthSubs.reduce((acc, s) => acc + (s.price ?? 0), 0),
      newSubs: monthSubs.length,
      activeSubs: activeThisMonth.length,
      newInstitutions: newInst.length,
      newApplications: newApps.length,
    });
  }

  // ── Croissance MoM ───────────────────────────────────────────────────────
  const lastMonth = months[months.length - 2];
  const thisMonth = months[months.length - 1];
  const revenueGrowth = lastMonth.revenue > 0
    ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
    : thisMonth.revenue > 0 ? 100 : 0;

  // ── Transactions récentes ────────────────────────────────────────────────
  const recentTransactions = subscriptions
    .filter(s => s.price != null && s.price > 0 && s.status !== "PENDING_PAYMENT")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
    .map(s => ({
      id: s.id,
      institutionName: s.institution.name,
      plan: s.plan,
      price: s.price,
      status: s.status,
      date: s.updatedAt,
    }));

  // ── Projection annuelle (basé sur les 3 derniers mois) ──────────────────
  const last3 = months.slice(-3);
  const avgMonthly = last3.reduce((acc, m) => acc + m.revenue, 0) / 3;
  const annualProjection = Math.round(avgMonthly * 12);

  // ── Candidatures stats ───────────────────────────────────────────────────
  const stagesFound = applications.filter(a => a.status === "COMPLETED").length;
  const totalApps = applications.length;

  return NextResponse.json({
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeSubscriptions: activeSubs.length,
      totalSubscriptions: subscriptions.filter(s => s.status !== "PENDING_PAYMENT").length,
      pendingPayments: subscriptions.filter(s => s.status === "PENDING_PAYMENT").length,
      avgRevenuePerSub: activeSubs.length > 0
        ? Math.round((totalRevenue / subscriptions.filter(s => s.status !== "PENDING_PAYMENT").length) * 100) / 100
        : 0,
      annualProjection,
      revenueGrowth,
      thisMonthRevenue: thisMonth.revenue,
      lastMonthRevenue: lastMonth.revenue,
      totalInstitutions: institutions.length,
      totalApplications: totalApps,
      stagesFound,
      conversionRate: totalApps > 0 ? Math.round((stagesFound / totalApps) * 100) : 0,
    },
    byPlan: {
      MONTHLY: {
        count: byPlan.MONTHLY.length,
        revenue: Math.round(byPlan.MONTHLY.reduce((a, s) => a + (s.price ?? 0), 0) * 100) / 100,
        active: byPlan.MONTHLY.filter(s => s.status === "ACTIVE").length,
      },
      QUARTERLY: {
        count: byPlan.QUARTERLY.length,
        revenue: Math.round(byPlan.QUARTERLY.reduce((a, s) => a + (s.price ?? 0), 0) * 100) / 100,
        active: byPlan.QUARTERLY.filter(s => s.status === "ACTIVE").length,
      },
      SEMESTER: {
        count: byPlan.SEMESTER.length,
        revenue: Math.round(byPlan.SEMESTER.reduce((a, s) => a + (s.price ?? 0), 0) * 100) / 100,
        active: byPlan.SEMESTER.filter(s => s.status === "ACTIVE").length,
      },
      ANNUAL: {
        count: byPlan.ANNUAL.length,
        revenue: Math.round(byPlan.ANNUAL.reduce((a, s) => a + (s.price ?? 0), 0) * 100) / 100,
        active: byPlan.ANNUAL.filter(s => s.status === "ACTIVE").length,
      },
      SCHOOL: {
        count: byPlan.SCHOOL.length,
        revenue: Math.round(byPlan.SCHOOL.reduce((a, s) => a + (s.price ?? 0), 0) * 100) / 100,
        active: byPlan.SCHOOL.filter(s => s.status === "ACTIVE").length,
      },
    },
    months,
    recentTransactions,
  });
}
