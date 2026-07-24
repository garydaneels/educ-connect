import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInstitutionUnavailability, sendStudentUnavailabilityResponse } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Réservé à l'étudiant" }, { status: 403 });

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      student: { select: { name: true } },
      institution: { select: { userId: true, name: true, email: true } },
    },
  });
  if (!app || app.studentId !== user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { date, reason } = await req.json();

  // Toggle : si existe déjà, supprimer
  const existing = await prisma.unavailability.findFirst({ where: { applicationId: id, date } });
  if (existing) {
    await prisma.unavailability.delete({ where: { id: existing.id } });
    return NextResponse.json({ deleted: true });
  }

  const unavail = await prisma.unavailability.create({
    data: { applicationId: id, date, reason: reason || null, requestedById: user.id },
  });

  const studentName = app.student.name || "L'étudiant";
  const stageLink = `/stage/${id}`;

  if (app.institution.email) {
    const instUser = await prisma.user.findUnique({
      where: { id: app.institution.userId },
      select: { emailUnavailability: true },
    });
    if (instUser?.emailUnavailability) {
      sendInstitutionUnavailability(
        app.institution.email,
        app.institution.name,
        studentName,
        date,
        reason,
        stageLink,
      ).catch(() => {});
    }
  }

  return NextResponse.json(unavail, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé à l'institution" }, { status: 403 });

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      institution: { select: { userId: true, name: true } },
    },
  });
  if (!app || app.institution.userId !== user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { unavailId, status } = await req.json();
  const VALID_UNAVAIL_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
  if (!VALID_UNAVAIL_STATUS.includes(status)) {
    return NextResponse.json({ error: "Statut d'indisponibilité invalide" }, { status: 400 });
  }
  const unavail = await prisma.unavailability.findUnique({
    where: { id: unavailId },
    select: { applicationId: true },
  });
  if (!unavail || unavail.applicationId !== id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const updated = await prisma.unavailability.update({
    where: { id: unavailId },
    data: { status },
  });

  const approved = status === "APPROVED";
  const studentName = app.student.name || app.student.email;
  const stageLink = `/stage/${id}`;

  const studentUser = await prisma.user.findUnique({
    where: { id: app.studentId },
    select: { emailUnavailability: true },
  });
  if (studentUser?.emailUnavailability) {
    sendStudentUnavailabilityResponse(
      app.student.email,
      studentName,
      app.institution.name,
      approved,
      stageLink,
    ).catch(() => {});
  }

  return NextResponse.json(updated);
}
