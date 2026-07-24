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

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector") || "";
  const studyYear = searchParams.get("studyYear") || "";
  const take = parseInt(searchParams.get("take") || "12");
  const skip = parseInt(searchParams.get("skip") || "0");

  const where = {
    ...(studyYear ? { studyYear } : {}),
    ...(sector ? { sectorPreference: sector } : {}),
  };

  const [profiles, total] = await prisma.$transaction([
    prisma.studentProfile.findMany({
      where,
      select: {
        studyYear: true,
        schoolName: true,
        sectorPreference: true,
        stageStartDate: true,
        stageEndDate: true,
        stageMaxHours: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.studentProfile.count({ where }),
  ]);

  return NextResponse.json({ students: profiles, total });
}
