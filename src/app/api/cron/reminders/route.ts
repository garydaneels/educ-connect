import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionExpiry, sendPendingApplicationReminder } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in8Days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  let expiryCount = 0;
  let reminderCount = 0;

  // ── 1. Rappels abonnements expirant dans 7 jours ──────────────────────────
  const expiringSubs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: in7Days, lt: in8Days },
    },
    include: {
      institution: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  for (const sub of expiringSubs) {
    if (!sub.endDate) continue;
    const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    try {
      await sendSubscriptionExpiry(
        sub.institution.user.email,
        sub.institution.user.name ?? "Contact",
        sub.institution.name,
        daysLeft,
        sub.endDate.toISOString(),
      );
      expiryCount++;
    } catch {
      // continue
    }
  }

  // ── 2. Rappels candidatures en attente depuis > 5 jours ───────────────────
  const pendingApps = await prisma.application.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: fiveDaysAgo },
    },
    select: { institutionId: true },
  });

  // Grouper par institution
  const countByInstitution = new Map<string, number>();
  for (const app of pendingApps) {
    countByInstitution.set(app.institutionId, (countByInstitution.get(app.institutionId) ?? 0) + 1);
  }

  if (countByInstitution.size > 0) {
    const institutions = await prisma.institution.findMany({
      where: { id: { in: [...countByInstitution.keys()] } },
      include: { user: { select: { email: true } } },
    });

    for (const inst of institutions) {
      const count = countByInstitution.get(inst.id) ?? 0;
      try {
        await sendPendingApplicationReminder(inst.user.email, inst.name, count);
        reminderCount++;
      } catch {
        // continue
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: { expiryReminders: expiryCount, pendingAppReminders: reminderCount },
  });
}
