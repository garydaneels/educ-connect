import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStudentApplicationAccepted, sendStudentStageConfirmed, sendAdminStageFound, sendStudentApplicationRejected, sendInstitutionInvitationAccepted, sendInstitutionInvitationDeclined } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  const data = await req.json();

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      institution: { select: { name: true, email: true, userId: true } },
      student: { select: { name: true, email: true, emailApplicationStatus: true } },
      slot: true,
    },
  });

  if (!application) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (user.role === "INSTITUTION" && application.institution.userId !== user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  if (user.role === "STUDENT") {
    if (application.studentId !== user.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    // Accepter ou décliner une invitation
    if (application.status === "INVITED") {
      if (data.action === "accept") {
        await prisma.application.update({ where: { id }, data: { status: "PENDING" } });
        await prisma.message.create({
          data: {
            applicationId: id,
            senderId: user.id,
            content: "✅ J'ai accepté votre invitation et suis intéressé(e) par ce stage. Hâte d'échanger avec vous !",
            type: "TEXT",
          },
        });
        if (application.institution.email) {
          const studentName = application.student.name || application.student.email;
          sendInstitutionInvitationAccepted(
            application.institution.email,
            application.institution.name,
            studentName,
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/institution/applications`,
          ).catch(() => {});
        }
        return NextResponse.json({ status: "PENDING" });
      }
      if (data.action === "decline") {
        await prisma.application.update({ where: { id }, data: { status: "REJECTED" } });
        if (application.institution.email) {
          const studentName = application.student.name || application.student.email;
          sendInstitutionInvitationDeclined(
            application.institution.email,
            application.institution.name,
            studentName,
          ).catch(() => {});
        }
        return NextResponse.json({ status: "REJECTED" });
      }
    }

    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // Acceptation directe de stage par l'institution (sans RDV)
  if (data.action === "accept" && user.role === "INSTITUTION") {
    try {
      await prisma.application.update({
        where: { id },
        data: { status: "ACCEPTED", stageStatus: "ONGOING" },
      });
      // Slot définitivement consommé — rien à restituer
      if (application.student.emailApplicationStatus) {
        sendStudentApplicationAccepted(
          application.student.email,
          application.student.name || application.student.email,
          application.institution.name,
          new Date().toISOString(),
          undefined,
        ).catch(() => {});
      }
      return NextResponse.json({ status: "ACCEPTED", stageStatus: "ONGOING" });
    } catch {
      return NextResponse.json({ error: "Erreur lors de l'opération" }, { status: 500 });
    }
  }

  const VALID_APP_STATUS = ["PENDING", "ACCEPTED", "REJECTED", "COMPLETED", "INVITED"] as const;
  if (data.status && !VALID_APP_STATUS.includes(data.status)) {
    return NextResponse.json({ error: "Statut d'application invalide" }, { status: 400 });
  }
  const updated = await prisma.application.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.appointmentDate ? { appointmentDate: new Date(data.appointmentDate) } : {}),
      ...(data.appointmentNote !== undefined ? { appointmentNote: data.appointmentNote } : {}),
      ...(data.stageFoundDate ? { stageFoundDate: new Date(data.stageFoundDate) } : {}),
    },
  });

  const studentName = application.student.name || application.student.email;
  const institutionName = application.institution.name;

  // Acceptation via RDV → email à l'étudiant
  if (data.status === "ACCEPTED" && data.appointmentDate && application.student.emailApplicationStatus) {
    sendStudentApplicationAccepted(
      application.student.email,
      studentName,
      institutionName,
      data.appointmentDate,
      data.appointmentNote,
    ).catch(() => {});
  }

  // Rendre la place au slot si rejet d'une candidature étudiante (pas d'une invitation)
  if (data.status === "REJECTED" && application.slotId && application.status !== "INVITED") {
    await prisma.internshipSlot.update({
      where: { id: application.slotId },
      data: { availablePlaces: { increment: 1 } },
    }).catch(() => {});
  }

  // Candidature refusée → email à l'étudiant
  if (data.status === "REJECTED" && application.student.emailApplicationStatus) {
    sendStudentApplicationRejected(
      application.student.email,
      studentName,
      institutionName,
    ).catch(() => {});
  }

  // Stage confirmé → emails admin + étudiant
  if (data.status === "COMPLETED") {
    if (application.student.emailApplicationStatus) {
      sendStudentStageConfirmed(application.student.email, studentName, institutionName).catch(() => {});
    }
    sendAdminStageFound(institutionName, studentName, data.stageFoundDate || new Date().toISOString()).catch(() => {});
  }

  return NextResponse.json(updated);
}
