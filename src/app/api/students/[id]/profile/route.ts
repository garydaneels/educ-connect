import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé aux institutions" }, { status: 403 });

  const { id: studentId } = await params;

  const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const hasApp = await prisma.application.findFirst({
    where: { institutionId: institution.id, studentId },
  });
  if (!hasApp) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const profile = await prisma.studentProfile.findFirst({
    where: { userId: studentId },
    select: { presentation: true, experiences: true, previousStages: true, stageStartDate: true, stageEndDate: true, stageMaxHours: true, conventionPath: true, studyYear: true, schoolName: true, sectorPreference: true },
  });

  return NextResponse.json(profile ?? null);
}
