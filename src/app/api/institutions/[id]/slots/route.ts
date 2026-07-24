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

  const slot = await prisma.internshipSlot.create({
    data: {
      institutionId: id,
      totalPlaces: data.totalPlaces,
      availablePlaces: data.totalPlaces,
      description: data.description,
    },
  });

  return NextResponse.json(slot);
}
