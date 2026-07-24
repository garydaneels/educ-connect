import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const actor = session?.user as { id?: string; role?: string } | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (actor.role !== "INSTITUTION") return NextResponse.json({ error: "Accès réservé aux institutions" }, { status: 403 });

  const institution = await prisma.institution.findUnique({
    where: { userId: actor.id },
    select: { id: true, views: true, slots: { select: { availablePlaces: true, totalPlaces: true } } },
  });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const apps = await prisma.application.findMany({
    where: { institutionId: institution.id },
    select: {
      id: true,
      status: true,
      stageStatus: true,
      createdAt: true,
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = apps.length;
  const pending = apps.filter(a => a.status === "PENDING").length;
  const accepted = apps.filter(a => a.status === "ACCEPTED").length;
  const rejected = apps.filter(a => a.status === "REJECTED").length;
  const active = apps.filter(a => a.stageStatus === "ONGOING").length;
  const completed = apps.filter(a => a.stageStatus === "COMPLETED").length;

  const availablePlaces = institution.slots.reduce((s, sl) => s + sl.availablePlaces, 0);
  const totalPlaces = institution.slots.reduce((s, sl) => s + sl.totalPlaces, 0);

  const recentApps = apps.slice(0, 6).map(a => ({
    id: a.id,
    status: a.status,
    stageStatus: a.stageStatus,
    createdAt: a.createdAt,
    student: a.student,
  }));

  // Candidatures par mois (6 derniers mois)
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString("fr-BE", { month: "short" });
    const count = apps.filter(a => {
      const cd = new Date(a.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  });

  return NextResponse.json({
    total, pending, accepted, rejected, active, completed,
    views: institution.views,
    availablePlaces, totalPlaces,
    recentApps, monthly,
  });
}
