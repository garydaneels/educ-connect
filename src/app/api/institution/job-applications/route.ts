import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || user.role !== "INSTITUTION") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const institution = await prisma.institution.findUnique({
      where: { userId: user.id },
    });

    if (!institution) {
      return NextResponse.json(
        { error: "Institution introuvable" },
        { status: 404 }
      );
    }

    // Récupérer toutes les candidatures pour les offres de cette institution
    const applications = await prisma.jobApplication.findMany({
      where: {
        jobOffer: {
          institutionId: institution.id,
        },
      },
      include: {
        jobOffer: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
