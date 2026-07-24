import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ applicationId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { applicationId } = await params;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { institution: { select: { userId: true } } },
  });
  if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

  const isStudent = app.studentId === user.id;
  const isInstitution = app.institution.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isStudent && !isInstitution && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const evals = await prisma.stageEvaluation.findMany({ where: { applicationId } });
  return NextResponse.json(evals);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { applicationId } = await params;
  const role = user.role as string;
  if (role !== "STUDENT" && role !== "INSTITUTION") {
    return NextResponse.json({ error: "Réservé aux étudiants et institutions" }, { status: 403 });
  }

  // Verify the user is a party in this application
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { institution: { select: { userId: true } } },
  });
  if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

  if (role === "STUDENT" && app.studentId !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (role === "INSTITUTION" && app.institution.userId !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Only allow evaluation on completed/ongoing stages
  if (!["COMPLETED", "ONGOING"].includes(app.stageStatus ?? "")) {
    return NextResponse.json({ error: "Le stage doit être en cours ou terminé pour laisser une évaluation" }, { status: 400 });
  }

  const body = await req.json();
  const { ratingGlobal, ratingIntegration, ratingTasks, ratingSupervision, ratingAutonomy, comment } = body;

  if (!ratingGlobal || ratingGlobal < 1 || ratingGlobal > 5) {
    return NextResponse.json({ error: "Note globale requise (1-5)" }, { status: 400 });
  }

  try {
    const evaluation = await prisma.stageEvaluation.upsert({
      where: { applicationId_authorRole: { applicationId, authorRole: role } },
      create: { applicationId, authorRole: role, ratingGlobal, ratingIntegration, ratingTasks, ratingSupervision, ratingAutonomy, comment },
      update: { ratingGlobal, ratingIntegration, ratingTasks, ratingSupervision, ratingAutonomy, comment },
    });
    return NextResponse.json(evaluation);
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }
}
