import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  const institution = await prisma.institution.findFirst({
    where: { id, userId: user.id },
  });

  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const data = await req.json();

  // Validate required fields
  if (data.totalPlaces === null || data.totalPlaces === undefined) {
    return NextResponse.json({ error: "Nombre de places requis" }, { status: 400 });
  }

  // Validate totalPlaces is a positive integer
  if (typeof data.totalPlaces !== "number" || data.totalPlaces <= 0 || data.totalPlaces > 1000) {
    return NextResponse.json({ error: "Nombre de places invalide (1-1000)" }, { status: 400 });
  }

  // Validate description
  if (!data.description || data.description.trim().length === 0) {
    return NextResponse.json({ error: "Description requise" }, { status: 400 });
  }
  if (data.description.length > 2000) {
    return NextResponse.json({ error: "Description trop longue (max 2000 caractères)" }, { status: 400 });
  }

  const slot = await prisma.internshipSlot.create({
    data: {
      institutionId: id,
      totalPlaces: data.totalPlaces,
      availablePlaces: data.totalPlaces,
      description: data.description.trim(),
    },
  });

  return NextResponse.json(slot);
}
