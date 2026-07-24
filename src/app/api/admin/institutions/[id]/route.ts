import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromStorage } from "@/lib/storage";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string } | undefined;
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();

  const institution = await prisma.institution.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!institution) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const updated = await prisma.institution.update({
    where: { id },
    data: {
      name: data.name ?? institution.name,
      commune: data.commune ?? institution.commune,
      address: data.address ?? institution.address,
      phone: data.phone ?? institution.phone,
      email: data.email ?? institution.email,
      website: data.website ?? institution.website,
    },
  });

  if (data.newCode) {
    const hashed = await bcrypt.hash(data.newCode, 10);
    await prisma.user.update({ where: { id: institution.userId }, data: { password: hashed } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string } | undefined;
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const institution = await prisma.institution.findUnique({ where: { id } });
  if (!institution) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Récupérer TOUS les IDs de candidatures liées à cette institution (avec ou sans slot)
    const applications = await tx.application.findMany({
      where: { institutionId: id },
      select: { id: true },
    });
    const appIds = applications.map(a => a.id);

    // Supprimer documents de stage et nettoyer Supabase Storage
    const documents = await tx.stageDocument.findMany({ where: { applicationId: { in: appIds } } });
    await Promise.all(documents.map(doc => deleteFromStorage(doc.path).catch(() => {})));

    // Supprimer tous les sous-enregistrements des candidatures
    await tx.stageEvaluation.deleteMany({ where: { applicationId: { in: appIds } } });
    await tx.stageDocument.deleteMany({ where: { applicationId: { in: appIds } } });
    await tx.unavailability.deleteMany({ where: { applicationId: { in: appIds } } });
    await tx.scheduleRequest.deleteMany({ where: { applicationId: { in: appIds } } });
    await tx.message.deleteMany({ where: { applicationId: { in: appIds } } });
    await tx.application.deleteMany({ where: { institutionId: id } });

    // Intérêts de l'institution envers des étudiants
    await tx.institutionInterest.deleteMany({ where: { institutionId: id } });

    // Offres d'emploi et leurs candidatures
    const jobOffers = await tx.jobOffer.findMany({ where: { institutionId: id }, select: { id: true } });
    const jobOfferIds = jobOffers.map(j => j.id);
    if (jobOfferIds.length > 0) {
      await tx.jobApplication.deleteMany({ where: { jobOfferId: { in: jobOfferIds } } });
    }
    await tx.jobOffer.deleteMany({ where: { institutionId: id } });

    // Slots, abonnements, notifications
    await tx.internshipSlot.deleteMany({ where: { institutionId: id } });
    await tx.subscription.deleteMany({ where: { institutionId: id } });
    await tx.notification.deleteMany({ where: { userId: institution.userId } });

    // Institution puis User (dans cet ordre pour respecter la FK)
    await tx.institution.delete({ where: { id } });
    await tx.user.delete({ where: { id: institution.userId } });
  });

  return NextResponse.json({ ok: true });
}
