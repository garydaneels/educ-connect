import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStudentStageStatusChanged } from "@/lib/email";

async function checkAccess(id: string, userId: string, role: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: { institution: { select: { userId: true } } },
  });
  if (!app) return null;
  if (role === "ADMIN") return app;
  if (role === "STUDENT" && app.studentId === userId) return app;
  if (role === "INSTITUTION" && app.institution.userId === userId) return app;
  return null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      institution: { select: { id: true, name: true, userId: true } },
      slot: true,
      stageDocuments: { orderBy: { createdAt: "desc" } },
      unavailabilities: { orderBy: { date: "asc" } },
      scheduleRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isStudent = user.role === "STUDENT" && application.studentId === user.id;
  const isInstitution = user.role === "INSTITUTION" && application.institution.userId === user.id;
  if (!isStudent && !isInstitution && user.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  return NextResponse.json(application);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé à l'institution" }, { status: 403 });

  const app = await checkAccess(id, user.id, user.role);
  if (!app) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { stageStatus } = await req.json();
  const VALID_STAGE_STATUS = ["ONGOING", "STOPPED", "NOT_VALIDATED", "COMPLETED"] as const;
  if (!VALID_STAGE_STATUS.includes(stageStatus)) {
    return NextResponse.json({ error: "Statut de stage invalide" }, { status: 400 });
  }
  const updated = await prisma.application.update({
    where: { id },
    data: { stageStatus },
    include: {
      student: { select: { id: true, name: true, email: true, emailApplicationStatus: true } },
      institution: { select: { name: true } },
    },
  });

  const studentName = updated.student.name || updated.student.email;
  const institutionName = updated.institution.name;

  if (stageStatus === "STOPPED" || stageStatus === "NOT_VALIDATED" || stageStatus === "COMPLETED") {
    if (updated.student.emailApplicationStatus) {
      sendStudentStageStatusChanged(
        updated.student.email,
        studentName,
        institutionName,
        stageStatus as "STOPPED" | "NOT_VALIDATED" | "COMPLETED",
      ).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
