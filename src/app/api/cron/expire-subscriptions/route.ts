import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();

  const [expiredSubs, expiredBoosts] = await Promise.all([
    // Expirer les abonnements dépassés
    prisma.subscription.updateMany({
      where: { status: "ACTIVE", endDate: { lt: now } },
      data: { status: "EXPIRED" },
    }),
    // Désactiver les boosts dépassés
    prisma.institution.updateMany({
      where: { boosted: true, boostEndDate: { lt: now } },
      data: { boosted: false },
    }),
  ]);

  return NextResponse.json({
    expiredSubscriptions: expiredSubs.count,
    expiredBoosts: expiredBoosts.count,
    checkedAt: now.toISOString(),
  });
}
