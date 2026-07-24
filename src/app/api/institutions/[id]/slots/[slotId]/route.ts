import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; slotId: string }> }) {
  const { id, slotId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  const institution = await prisma.institution.findFirst({ where: { id, userId: user.id } });
  if (!institution) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const slot = await prisma.internshipSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.institutionId !== id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Les stages en cours sont dissociés du slot (pas supprimés)
  await prisma.application.updateMany({
    where: { slotId, stageStatus: "ONGOING" },
    data: { slotId: null },
  });

  // Supprimer les sous-enregistrements des candidatures restantes avant de les supprimer
  const toDelete = await prisma.application.findMany({
    where: { slotId },
    select: { id: true },
  });
  const appIds = toDelete.map(a => a.id);

  if (appIds.length > 0) {
    await prisma.stageEvaluation.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.stageDocument.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.unavailability.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.scheduleRequest.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.application.deleteMany({ where: { id: { in: appIds } } });
  }

  await prisma.internshipSlot.delete({ where: { id: slotId } });
  return NextResponse.json({ ok: true });
}
