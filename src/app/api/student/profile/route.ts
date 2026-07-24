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

  // Validate input lengths and types
  if (data.presentation !== undefined) {
    if (typeof data.presentation !== "string" || data.presentation.length > 5000) {
      return NextResponse.json({ error: "Présentation trop longue (max 5000 caractères)" }, { status: 400 });
    }
  }

  if (data.schoolName !== undefined) {
    if (data.schoolName && (typeof data.schoolName !== "string" || data.schoolName.length > 255)) {
      return NextResponse.json({ error: "Nom d'école trop long (max 255 caractères)" }, { status: 400 });
    }
  }

  if (data.experiences !== undefined) {
    if (!Array.isArray(data.experiences)) {
      return NextResponse.json({ error: "Les expériences doivent être un tableau" }, { status: 400 });
    }
    if (data.experiences.length > 100) {
      return NextResponse.json({ error: "Trop d'expériences (max 100)" }, { status: 400 });
    }
  }

  if (data.previousStages !== undefined) {
    if (!Array.isArray(data.previousStages)) {
      return NextResponse.json({ error: "Les stages précédents doivent être un tableau" }, { status: 400 });
    }
    if (data.previousStages.length > 50) {
      return NextResponse.json({ error: "Trop de stages précédents (max 50)" }, { status: 400 });
    }
  }

  if (data.stageMaxHours !== undefined) {
    if (data.stageMaxHours && (typeof data.stageMaxHours !== "number" || data.stageMaxHours < 0 || data.stageMaxHours > 10000)) {
      return NextResponse.json({ error: "Nombre d'heures invalide (0-10000)" }, { status: 400 });
    }
  }

  if (data.stageStartDate !== undefined && data.stageStartDate) {
    const date = new Date(data.stageStartDate);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date de début invalide" }, { status: 400 });
    }
  }

  if (data.stageEndDate !== undefined && data.stageEndDate) {
    const date = new Date(data.stageEndDate);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
    }
  }

  if (data.studyYear !== undefined && data.studyYear) {
    const validYears = ["BAC1", "BAC2", "BAC3", "MASTER1", "MASTER2"];
    if (!validYears.includes(data.studyYear)) {
      return NextResponse.json({ error: "Année d'étude invalide" }, { status: 400 });
    }
  }

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
