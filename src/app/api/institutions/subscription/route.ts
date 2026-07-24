import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const sub = await prisma.subscription.findUnique({ where: { institutionId: institution.id } });
  if (!sub || sub.status !== "ACTIVE") return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 400 });

  await prisma.subscription.update({
    where: { institutionId: institution.id },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ ok: true });
}
