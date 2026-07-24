import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNewMessage } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { institution: { select: { userId: true } } },
  });
  if (!application) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isStudent = application.studentId === user.id;
  const isInstitution = application.institution.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isStudent && !isInstitution && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { applicationId },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  const { content, type, proposedDate, proposedNote } = await req.json();

  if (!content || content.length > 5000) {
    return NextResponse.json({ error: "Message doit faire entre 1 et 5000 caractères" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      institution: { select: { userId: true, name: true, email: true } },
      student:     { select: { id: true, name: true, email: true } },
    },
  });

  if (!application) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isStudent = application.studentId === user.id;
  const isInstitution = application.institution.userId === user.id;
  if (!isStudent && !isInstitution) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      applicationId,
      senderId: user.id,
      content,
      type: type || "TEXT",
      proposedDate: proposedDate || null,
      proposedNote: proposedNote || null,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  if (type === "APPOINTMENT" && proposedDate && isInstitution) {
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "ACCEPTED",
        appointmentDate: new Date(proposedDate),
        appointmentNote: proposedNote || null,
      },
    });
  }

  // Notifier le destinataire (in-app + email)
  const recipientId   = isStudent ? application.institution.userId : application.studentId;
  const recipientName = isStudent ? application.institution.name   : (application.student.name || application.student.email);
  const recipientEmail = isStudent ? (application.institution.email ?? null) : application.student.email;
  const senderName    = isStudent ? (application.student.name || "Un étudiant") : application.institution.name;
  const notifLink     = isStudent ? `/institution/applications` : `/student/applications`;
  const preview       = content?.slice(0, 120) || "";

  if (recipientEmail) {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { emailNewMessage: true },
    });
    if (recipient?.emailNewMessage) {
      sendNewMessage(recipientEmail, recipientName, senderName, preview, notifLink).catch(() => {});
    }
  }

  return NextResponse.json(message);
}
