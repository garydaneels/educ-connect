import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStudentInstitutionInterest } from "@/lib/email";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const interests = await prisma.institutionInterest.findMany({
    where: { institutionId: institution.id },
    select: { studentId: true },
  });

  return NextResponse.json(interests.map(i => i.studentId));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const institution = await prisma.institution.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true },
  });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId manquant" }, { status: 400 });

  const existing = await prisma.institutionInterest.findUnique({
    where: { institutionId_studentId: { institutionId: institution.id, studentId } },
  });

  // Toggle off — retirer l'intérêt et annuler l'invitation si encore INVITED
  if (existing) {
    await prisma.institutionInterest.delete({ where: { id: existing.id } });
    await prisma.application.deleteMany({
      where: { institutionId: institution.id, studentId, status: "INVITED" },
    });
    return NextResponse.json({ interested: false });
  }

  // Toggle on — créer l'intérêt + une invitation (application INVITED)
  await prisma.institutionInterest.create({
    data: { institutionId: institution.id, studentId },
  });

  // Ne créer l'application que si aucune candidature n'existe déjà entre les deux
  const existingApp = await prisma.application.findFirst({
    where: { institutionId: institution.id, studentId },
  });

  if (!existingApp) {
    await prisma.application.create({
      data: { institutionId: institution.id, studentId, status: "INVITED" },
    });
  }

  // Email à l'étudiant (si activé dans ses préférences)
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { email: true, name: true, emailInstitutionInterest: true },
  });
  if (student?.email && student.emailInstitutionInterest) {
    sendStudentInstitutionInterest(
      student.email,
      student.name || student.email,
      institution.name,
    ).catch(() => {});
  }

  return NextResponse.json({ interested: true });
}
