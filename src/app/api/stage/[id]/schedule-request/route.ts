import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInstitutionScheduleRequest, sendStudentScheduleRequestResponse } from "@/lib/email";

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

  const { description } = await req.json();
  if (!description?.trim()) return NextResponse.json({ error: "Description requise" }, { status: 400 });

  const schedReq = await prisma.scheduleRequest.create({
    data: { applicationId: id, description, requestedById: user.id },
  });

  const studentName = app.student.name || "L'étudiant";
  const stageLink = `/stage/${id}`;

  if (app.institution.email) {
    const instUser = await prisma.user.findUnique({
      where: { id: app.institution.userId },
      select: { emailNewMessage: true },
    });
    if (instUser?.emailNewMessage) {
      sendInstitutionScheduleRequest(
        app.institution.email,
        app.institution.name,
        studentName,
        description,
        stageLink,
      ).catch(() => {});
    }
  }

  return NextResponse.json(schedReq, { status: 201 });
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

  const { requestId, status, responseNote } = await req.json();
  const schedReq = await prisma.scheduleRequest.findUnique({
    where: { id: requestId },
    select: { applicationId: true },
  });
  if (!schedReq || schedReq.applicationId !== id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const updated = await prisma.scheduleRequest.update({
    where: { id: requestId },
    data: { status, responseNote: responseNote || null },
  });

  const approved = status === "APPROVED";
  const studentName = app.student.name || app.student.email;
  const stageLink = `/stage/${id}`;

  const studentUser = await prisma.user.findUnique({
    where: { id: app.studentId },
    select: { emailScheduleUpdate: true },
  });
  if (studentUser?.emailScheduleUpdate) {
    sendStudentScheduleRequestResponse(
      app.student.email,
      studentName,
      app.institution.name,
      approved,
      responseNote,
      stageLink,
    ).catch(() => {});
  }

  return NextResponse.json(updated);
}
