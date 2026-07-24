import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "PROFESSIONAL") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const profile = await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      presentation: null,
      experiences: "[]",
      qualifications: "[]",
      sectorPreference: null,
      contractType: null,
    },
    update: {},
  });

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "PROFESSIONAL") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const data = await req.json();

  const profile = await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      presentation: data.presentation ?? null,
      experiences: JSON.stringify(data.experiences ?? []),
      qualifications: JSON.stringify(data.qualifications ?? []),
      sectorPreference: data.sectorPreference ?? null,
      contractType: data.contractType ?? null,
    },
    update: {
      ...(data.presentation !== undefined ? { presentation: data.presentation } : {}),
      ...(data.experiences !== undefined ? { experiences: JSON.stringify(data.experiences) } : {}),
      ...(data.qualifications !== undefined ? { qualifications: JSON.stringify(data.qualifications) } : {}),
      ...(data.sectorPreference !== undefined ? { sectorPreference: data.sectorPreference || null } : {}),
      ...(data.contractType !== undefined ? { contractType: data.contractType || null } : {}),
    },
  });

  return NextResponse.json(profile);
}
