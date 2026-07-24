import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json(null);
  const user = session.user as { id: string; role: string };

  if (user.role === "STUDENT") {
    const app = await prisma.application.findFirst({
      where: { studentId: user.id, stageStatus: "ONGOING" },
      select: { id: true },
    });
    return NextResponse.json(app ?? null);
  }

  if (user.role === "INSTITUTION") {
    const institution = await prisma.institution.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!institution) return NextResponse.json({ count: 0 });
    const count = await prisma.application.count({
      where: { institutionId: institution.id, stageStatus: "ONGOING" },
    });
    return NextResponse.json({ count });
  }

  return NextResponse.json(null);
}
