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

  // Validate input lengths
  if (data.name && data.name.length > 255) {
    return NextResponse.json({ error: "Le nom est trop long (max 255 caractères)" }, { status: 400 });
  }
  if (data.description && data.description.length > 5000) {
    return NextResponse.json({ error: "La description est trop longue (max 5000 caractères)" }, { status: 400 });
  }
  if (data.address && data.address.length > 255) {
    return NextResponse.json({ error: "L'adresse est trop longue (max 255 caractères)" }, { status: 400 });
  }
  if (data.commune && data.commune.length > 100) {
    return NextResponse.json({ error: "La commune est trop longue (max 100 caractères)" }, { status: 400 });
  }
  if (data.phone && data.phone.length > 20) {
    return NextResponse.json({ error: "Le téléphone est trop long (max 20 caractères)" }, { status: 400 });
  }
  if (data.email && data.email.length > 255) {
    return NextResponse.json({ error: "L'email est trop long (max 255 caractères)" }, { status: 400 });
  }
  if (data.website && data.website.length > 255) {
    return NextResponse.json({ error: "Le site web est trop long (max 255 caractères)" }, { status: 400 });
  }
  if (data.mission && data.mission.length > 5000) {
    return NextResponse.json({ error: "La mission est trop longue (max 5000 caractères)" }, { status: 400 });
  }
  if (data.stageDescription && data.stageDescription.length > 5000) {
    return NextResponse.json({ error: "La description de stage est trop longue (max 5000 caractères)" }, { status: 400 });
  }
  if (data.supervisorName && data.supervisorName.length > 100) {
    return NextResponse.json({ error: "Le nom du responsable est trop long (max 100 caractères)" }, { status: 400 });
  }
  if (data.supervisorTitle && data.supervisorTitle.length > 100) {
    return NextResponse.json({ error: "Le titre du responsable est trop long (max 100 caractères)" }, { status: 400 });
  }

  // Validate email format if provided
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
  }

  // Validate teamSize if provided
  if (data.teamSize !== undefined) {
    if (typeof data.teamSize !== "number" || data.teamSize < 0 || data.teamSize > 10000) {
      return NextResponse.json({ error: "Taille d'équipe invalide (0-10000)" }, { status: 400 });
    }
  }

  // Validate founded year if provided
  if (data.founded !== undefined) {
    if (typeof data.founded !== "number" || data.founded < 1800 || data.founded > new Date().getFullYear()) {
      return NextResponse.json({ error: `Année de fondation invalide (1800-${new Date().getFullYear()})` }, { status: 400 });
    }
  }

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
