import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || user.role !== "INSTITUTION") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const institution = await prisma.institution.findUnique({
      where: { userId: user.id },
    });

    if (!institution) {
      return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });
    }

    const jobs = await prisma.jobOffer.findMany({
      where: { institutionId: institution.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[institution/jobs GET] Erreur:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
