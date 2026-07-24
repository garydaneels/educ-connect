import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json(profile ?? null);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const data = await req.json();

  const profile = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      presentation: data.presentation ?? null,
      experiences: JSON.stringify(data.experiences ?? []),
      previousStages: JSON.stringify(data.previousStages ?? []),
    },
    update: {
      ...(data.presentation !== undefined ? { presentation: data.presentation } : {}),
      ...(data.experiences !== undefined ? { experiences: JSON.stringify(data.experiences) } : {}),
      ...(data.previousStages !== undefined ? { previousStages: JSON.stringify(data.previousStages) } : {}),
      ...(data.stageStartDate !== undefined ? { stageStartDate: data.stageStartDate ? new Date(data.stageStartDate) : null } : {}),
      ...(data.stageEndDate !== undefined ? { stageEndDate: data.stageEndDate ? new Date(data.stageEndDate) : null } : {}),
      ...(data.stageMaxHours !== undefined ? { stageMaxHours: data.stageMaxHours ? Number(data.stageMaxHours) : null } : {}),
      ...(data.studyYear !== undefined ? { studyYear: data.studyYear || null } : {}),
      ...(data.schoolName !== undefined ? { schoolName: data.schoolName || null } : {}),
      ...(data.sectorPreference !== undefined ? { sectorPreference: data.sectorPreference || null } : {}),
    },
  });

  return NextResponse.json(profile);
}
