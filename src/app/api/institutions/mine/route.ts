import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    let userId: string | undefined;

    // Try to get user ID from session first
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userId = (session.user as { id: string }).id;
    } else {
      // Fallback: get from header if session not found
      userId = req.headers.get("X-User-ID") || undefined;
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const institution = await prisma.institution.findUnique({
      where: { userId },
      include: { slots: { orderBy: { startDate: "asc" } }, subscription: true },
    });

    return NextResponse.json(institution);
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
