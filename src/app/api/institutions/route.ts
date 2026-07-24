import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commune    = searchParams.get("commune");
  const publicType = searchParams.get("publicType");
  const hebergement = searchParams.get("hebergement");
  const organisme  = searchParams.get("organisme");
  const stageStart = searchParams.get("stageStart"); // YYYY-MM-DD
  const stageEnd   = searchParams.get("stageEnd");   // YYYY-MM-DD
  const take       = parseInt(searchParams.get("take") || "0");
  const skip       = parseInt(searchParams.get("skip") || "0");

  const now = new Date();

  const slotWhere = {
    availablePlaces: { gt: 0 },
    ...(stageStart && stageEnd ? {
      startDate: { lte: new Date(stageEnd) },
      endDate:   { gte: new Date(stageStart) },
    } : {}),
  };

  const where = {
    subscription: {
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    ...(commune    ? { commune } : {}),
    ...(publicType ? { publicTypes: { contains: publicType } } : {}),
    ...(hebergement ? { hebergements: { contains: hebergement } } : {}),
    ...(organisme  ? { organismes: { contains: organisme } } : {}),
    ...(stageStart && stageEnd ? { slots: { some: slotWhere } } : {}),
  };

  const queryOptions = {
    where,
    select: {
      id: true,
      name: true,
      address: true,
      commune: true,
      phone: true,
      email: true,
      description: true,
      publicTypes: true,
      hebergements: true,
      organismes: true,
      boosted: true,
      lat: true,
      lng: true,
      slots: {
        where: slotWhere,
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: [{ boosted: "desc" }, { name: "asc" }],
    ...(take ? { take, skip } : {}),
  };

  if (take) {
    const [institutions, total] = await prisma.$transaction([
      prisma.institution.findMany(queryOptions as Parameters<typeof prisma.institution.findMany>[0]),
      prisma.institution.count({ where }),
    ]);
    return NextResponse.json({ institutions, hasMore: skip + take < total, total });
  }

  const institutions = await prisma.institution.findMany(queryOptions as Parameters<typeof prisma.institution.findMany>[0]);
  return NextResponse.json(institutions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  if (user.role !== "INSTITUTION") {
    return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });
  }

  const data = await req.json();

  const institution = await prisma.institution.create({
    data: {
      userId: user.id,
      name: data.name,
      description: data.description,
      address: data.address,
      commune: data.commune,
      phone: data.phone,
      email: data.email,
      website: data.website,
      publicTypes: JSON.stringify(data.publicTypes),
      hebergements: JSON.stringify(data.hebergements),
      organismes: JSON.stringify(data.organismes),
      status: "APPROVED",
    },
  });

  return NextResponse.json(institution);
}
