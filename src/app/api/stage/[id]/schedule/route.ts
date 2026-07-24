import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé à l'institution" }, { status: 403 });

  const app = await prisma.application.findUnique({
    where: { id },
    include: { institution: { select: { userId: true } } },
  });
  if (!app || app.institution.userId !== user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { weeklySchedule } = await req.json();
  const updated = await prisma.application.update({
    where: { id },
    data: { weeklySchedule: JSON.stringify(weeklySchedule) },
  });
  return NextResponse.json(updated);
}
