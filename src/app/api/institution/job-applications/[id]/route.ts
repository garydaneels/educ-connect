import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();
  const allowed = ["PENDING", "REVIEWED", "CONTACTED", "REJECTED"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const institution = await prisma.institution.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const app = await prisma.jobApplication.findUnique({
    where: { id },
    include: { jobOffer: { select: { institutionId: true } } },
  });
  if (!app || app.jobOffer.institutionId !== institution.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const updated = await prisma.jobApplication.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}
