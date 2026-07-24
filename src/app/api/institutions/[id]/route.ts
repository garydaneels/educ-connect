import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: {
      slots: { where: { availablePlaces: { gt: 0 } }, orderBy: { startDate: "asc" } },
    },
  });

  if (!institution) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(institution);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };

  let institution;
  if (user.role === "ADMIN") {
    institution = await prisma.institution.findUnique({ where: { id } });
  } else {
    institution = await prisma.institution.findFirst({ where: { id, userId: user.id } });
  }
  if (!institution) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const data = await req.json();

  const updated = await prisma.institution.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      address: data.address,
      commune: data.commune,
      phone: data.phone,
      email: data.email,
      website: data.website,
      publicTypes: data.publicTypes ? JSON.stringify(data.publicTypes) : undefined,
      hebergements: data.hebergements ? JSON.stringify(data.hebergements) : undefined,
      organismes: data.organismes ? JSON.stringify(data.organismes) : undefined,
      mission: data.mission,
      stageDescription: data.stageDescription,
      supervisorName: data.supervisorName,
      supervisorTitle: data.supervisorTitle,
      teamSize: data.teamSize,
      founded: data.founded,
    },
  });

  // Géocoder l'adresse si elle a changé
  const addressChanged = data.address !== institution.address || data.commune !== institution.commune;
  if (addressChanged && data.address && data.commune) {
    geocodeAddress(data.address, data.commune).then(coords => {
      if (coords) {
        prisma.institution.update({ where: { id }, data: { lat: coords.lat, lng: coords.lng } }).catch(() => {});
      }
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}
