import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé aux institutions" }, { status: 403 });

  const institution = await prisma.institution.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          jobsAddonPacks: true,
          jobOffersAddonPacks: true,
          startDate: true,
          endDate: true,
          paymentReference: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  return NextResponse.json({
    institutionName: institution.name,
    subscription: institution.subscription,
  });
}
