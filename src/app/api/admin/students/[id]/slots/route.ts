import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { amount } = await req.json();
  if (!amount || typeof amount !== "number" || amount < 1 || amount > 10) {
    return NextResponse.json({ error: "Montant invalide (1-10)" }, { status: 400 });
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId: id } });
  if (!profile) return NextResponse.json({ error: "Profil étudiant introuvable" }, { status: 404 });

  const updated = await prisma.studentProfile.update({
    where: { userId: id },
    data: { applicationSlots: { increment: amount } },
  });

  return NextResponse.json({ applicationSlots: updated.applicationSlots });
}
