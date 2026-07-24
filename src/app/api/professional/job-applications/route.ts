import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "PROFESSIONAL") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const applications = await prisma.jobApplication.findMany({
    where: { userId: user.id },
    include: {
      jobOffer: { include: { institution: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}
