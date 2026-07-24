import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const actor = session?.user as { id?: string; role?: string } | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (actor.role !== "INSTITUTION" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux institutions" }, { status: 403 });
  }

  const { id: userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      studentProfile: {
        select: {
          presentation: true,
          cvPath: true,
          letterPath: true,
          experiences: true,
          previousStages: true,
        },
      },
    },
  });

  if (!user || !user.studentProfile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  if (actor.role !== "ADMIN") {
    const hasRelation = await prisma.application.findFirst({
      where: { studentId: userId, institution: { userId: actor.id } },
      select: { id: true },
    });
    if (!hasRelation) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
  }

  return NextResponse.json(user);
}
