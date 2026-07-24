import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const interests = await prisma.institutionInterest.findMany({
    where: { studentId: user.id },
    select: { institutionId: true },
  });

  return NextResponse.json(interests.map(i => i.institutionId));
}
