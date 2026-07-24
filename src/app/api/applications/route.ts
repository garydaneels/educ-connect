import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/storage";
import { sendInstitutionNewApplication } from "@/lib/email";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };

  if (user.role === "STUDENT") {
    const applications = await prisma.application.findMany({
      where: { studentId: user.id },
      include: { institution: true, slot: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(applications);
  }

  if (user.role === "INSTITUTION") {
    const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
    if (!institution) return NextResponse.json([]);

    const applications = await prisma.application.findMany({
      where: { institutionId: institution.id },
      include: { student: { select: { id: true, name: true, email: true } }, slot: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(applications);
  }

  return NextResponse.json({ error: "Rôle inconnu" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  try {
    const formData = await req.formData();
    const slotId = formData.get("slotId") as string;
    const institutionId = formData.get("institutionId") as string;
    const message = formData.get("message") as string | null;
    const cvFile = formData.get("cv") as File | null;
    const letterFile = formData.get("letter") as File | null;
    const existingCvPath = formData.get("cvPath") as string | null;
    const existingLetterPath = formData.get("letterPath") as string | null;

    if (!slotId || !institutionId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const existing = await prisma.application.findFirst({ where: { studentId: user.id, slotId } });
    if (existing) return NextResponse.json({ error: "Vous avez déjà postulé pour cette période" }, { status: 400 });

    const slot = await prisma.internshipSlot.findUnique({ where: { id: slotId }, select: { institutionId: true } });
    if (!slot || slot.institutionId !== institutionId) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }

    // Vérification du quota de candidatures
    const [profile, activeCount] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { applicationSlots: true } }),
      prisma.application.count({ where: { studentId: user.id, status: { notIn: ["REJECTED", "COMPLETED"] } } }),
    ]);
    const quota = profile?.applicationSlots ?? 5;
    if (activeCount >= quota) {
      return NextResponse.json(
        { error: `Vous avez atteint votre limite de ${quota} candidature(s) active(s). Une place se libère quand une candidature est refusée ou terminée.` },
        { status: 400 }
      );
    }

    let application;
    try {
      application = await prisma.$transaction(async (tx) => {
        const appCount = await tx.application.count({
          where: { studentId: user.id, status: { notIn: ["REJECTED", "COMPLETED"] } },
        });
        if (appCount >= quota) throw new Error("QUOTA_EXCEEDED");

        const decremented = await tx.internshipSlot.updateMany({
          where: { id: slotId, availablePlaces: { gt: 0 } },
          data: { availablePlaces: { decrement: 1 } },
        });
        if (decremented.count === 0) throw new Error("NO_PLACES");

        return tx.application.create({
          data: { studentId: user.id, institutionId, slotId, message: message || null },
          include: {
            student: { select: { name: true, email: true } },
            institution: { select: { name: true, email: true, userId: true, user: { select: { emailNewApplication: true } } } },
            slot: { select: { id: true } },
          },
        });
      });
    } catch (e) {
      if (e instanceof Error && e.message === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          { error: `Vous avez atteint votre limite de ${quota} candidature(s) active(s). Une place se libère quand une candidature est refusée ou terminée.` },
          { status: 400 }
        );
      }
      if (e instanceof Error && e.message === "NO_PLACES") {
        return NextResponse.json({ error: "Plus de places disponibles pour cette période" }, { status: 400 });
      }
      throw e;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
    const ALLOWED_MIME = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ALLOWED_EXT = [".pdf", ".doc", ".docx"];

    const validateFile = (file: File): string | null => {
      if (file.size > MAX_SIZE) return "trop volumineux (10 Mo maximum)";
      if (!ALLOWED_MIME.includes(file.type)) return "format non autorisé (PDF ou Word)";
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) return "extension non autorisée";
      return null;
    };

    if (cvFile && cvFile.size > 0) {
      const err = validateFile(cvFile);
      if (err) return NextResponse.json({ error: `CV ${err}` }, { status: 400 });
    }
    if (letterFile && letterFile.size > 0) {
      const err = validateFile(letterFile);
      if (err) return NextResponse.json({ error: `Lettre ${err}` }, { status: 400 });
    }

    let cvPath: string | null = existingCvPath || null;
    let letterPath: string | null = existingLetterPath || null;

    try {
      if (cvFile && cvFile.size > 0) {
        const ext = cvFile.name.split(".").pop() || "pdf";
        cvPath = await uploadToStorage(
          `applications/${application.id}/cv.${ext}`,
          Buffer.from(await cvFile.arrayBuffer()),
          cvFile.type || "application/octet-stream"
        );
      }

      if (letterFile && letterFile.size > 0) {
        const ext = letterFile.name.split(".").pop() || "pdf";
        letterPath = await uploadToStorage(
          `applications/${application.id}/lettre.${ext}`,
          Buffer.from(await letterFile.arrayBuffer()),
          letterFile.type || "application/octet-stream"
        );
      }

      if (cvPath || letterPath) {
        await prisma.application.update({ where: { id: application.id }, data: { cvPath, letterPath } });
      }
    } catch (err) {
      await prisma.$transaction(async (tx) => {
        await tx.internshipSlot.update({
          where: { id: slotId },
          data: { availablePlaces: { increment: 1 } },
        });
        await tx.application.delete({ where: { id: application.id } });
      }).catch(() => {});
      throw err;
    }

    if (application.institution.email && application.institution.user.emailNewApplication) {
      sendInstitutionNewApplication(
        application.institution.email,
        application.institution.name,
        application.student.name || application.student.email,
      ).catch(() => {});
    }

    return NextResponse.json({ ...application, cvPath, letterPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
