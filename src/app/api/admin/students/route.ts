import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      studentProfile: { select: { applicationSlots: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      applicationSlots: s.studentProfile?.applicationSlots ?? 0,
    }))
  );
}
